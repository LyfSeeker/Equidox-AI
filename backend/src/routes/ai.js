import { Router } from "express";
import { query } from "../db/client.js";
import {
  analyzeMilestone,
  chatAboutReport,
  hashReport,
  PROMPT_VERSION,
} from "../services/ai.js";
import { uploadJsonToIpfs } from "../services/ipfs.js";

const router = Router();

/** In-memory async job store for long analyses */
const jobs = new Map();

async function persistReport({ grantId, milestoneId, analysis, reportHash }) {
  const result = await query(
    `INSERT INTO ai_reports (
       milestone_id, grant_id, model, provider, prompt_version,
       completion_score, confidence_score, risk_score, trust_score,
       recommendation, summary, report_json, ipfs_hash,
       latency_ms, tokens_prompt, tokens_completion, tokens_total
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8, $9,
       $10, $11, $12, $13,
       $14, $15, $16, $17
     ) RETURNING *`,
    [
      milestoneId || null,
      grantId || null,
      analysis.model || null,
      analysis.provider || analysis.source || null,
      analysis.prompt_version || PROMPT_VERSION,
      analysis.completion_score,
      analysis.confidence_score,
      analysis.risk_score,
      analysis.trust_score ?? null,
      analysis.recommendation || analysis.recommended_action,
      analysis.summary,
      JSON.stringify(analysis),
      reportHash,
      analysis.latency_ms ?? null,
      analysis.tokens?.prompt ?? null,
      analysis.tokens?.completion ?? null,
      analysis.tokens?.total ?? null,
    ]
  );
  return result.rows[0];
}

/**
 * POST /api/ai/analyze
 * DeepSeek verification report (no on-chain decision).
 */
router.post("/analyze", async (req, res, next) => {
  try {
    const {
      repoUrl,
      githubUrl,
      documentationUrl,
      docsUrl,
      demoUrl,
      milestone,
      milestoneId,
      grantId,
      markdownDocs,
      pdfText,
      async: runAsync,
    } = req.body;

    const repo = repoUrl || githubUrl;
    if (!repo) {
      return res.status(400).json({ error: "GitHub URL (repoUrl) is required" });
    }

    if (runAsync) {
      const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      jobs.set(jobId, { status: "running", createdAt: Date.now() });

      (async () => {
        try {
          const analysis = await analyzeMilestone({
            repoUrl: repo,
            demoUrl,
            docsUrl: documentationUrl || docsUrl,
            milestoneTitle:
              typeof milestone === "string"
                ? milestone
                : milestone?.title || "Milestone",
            milestoneDescription:
              typeof milestone === "object" ? milestone?.description : null,
            milestone,
            markdownDocs,
            pdfText,
          });
          const reportHash = hashReport(analysis);
          await uploadJsonToIpfs(analysis).catch(() => ({ hashBytes: reportHash }));
          let row = null;
          if (milestoneId || grantId) {
            row = await persistReport({
              grantId,
              milestoneId,
              analysis,
              reportHash,
            });
          }
          jobs.set(jobId, {
            status: "done",
            analysis,
            reportHash,
            trustScore: analysis.trust_score,
            recommendation:
              analysis.recommendation || analysis.recommended_action,
            reportId: row?.id || null,
          });
        } catch (err) {
          console.error("[ai/analyze async]", err);
          jobs.set(jobId, {
            status: "error",
            error: err.message,
            code: err.code || null,
          });
        }
      })();

      return res.status(202).json({ jobId, status: "running" });
    }

    const analysis = await analyzeMilestone({
      repoUrl: repo,
      demoUrl,
      docsUrl: documentationUrl || docsUrl,
      milestoneTitle:
        typeof milestone === "string"
          ? milestone
          : milestone?.title || "Milestone",
      milestoneDescription:
        typeof milestone === "object" ? milestone?.description : null,
      milestone,
      markdownDocs,
      pdfText,
    });

    const reportHash = hashReport(analysis);
    await uploadJsonToIpfs(analysis).catch(() => ({ hashBytes: reportHash }));

    let row = null;
    if (milestoneId || grantId) {
      row = await persistReport({
        grantId,
        milestoneId,
        analysis,
        reportHash,
      });
    }

    res.json({
      analysis,
      report: analysis,
      hash: reportHash,
      verificationHash: reportHash,
      trustScore: analysis.trust_score,
      recommendation: analysis.recommendation || analysis.recommended_action,
      reportId: row?.id || null,
      promptVersion: PROMPT_VERSION,
      model: analysis.model,
      provider: analysis.provider,
      latencyMs: analysis.latency_ms,
      tokens: analysis.tokens,
    });
  } catch (err) {
    if (err.code === "AI_NOT_CONFIGURED" || err.code === "DEEPSEEK_NOT_CONFIGURED") {
      return res.status(503).json({
        error: err.message,
        code: err.code,
      });
    }
    next(err);
  }
});

router.get("/jobs/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

/**
 * POST /api/ai/chat — reviewer copilot
 */
router.post("/chat", async (req, res, next) => {
  try {
    const { message, milestone, githubData, analysis, history } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    const result = await chatAboutReport({
      message,
      milestone,
      githubData: githubData || analysis?.github,
      analysis,
      history: Array.isArray(history) ? history : [],
    });

    res.json(result);
  } catch (err) {
    if (err.code === "DEEPSEEK_NOT_CONFIGURED") {
      return res.status(503).json({ error: err.message, code: err.code });
    }
    next(err);
  }
});

router.get("/reports/:milestoneId", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM ai_reports
       WHERE milestone_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [req.params.milestoneId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

export default router;
export { persistReport };
