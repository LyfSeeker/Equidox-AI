import { buildReviewContext, contextFingerprint } from "../lib/contextBuilder.js";
import { assembleSystemPrompt, loadFewShotExamples } from "../lib/promptAssembler.js";
import { analysisCache } from "../lib/analysisCache.js";
import { extractJson, validateReport } from "../lib/validate.js";
import {
  PIPELINE_STAGES,
  briefingForStage,
  evidenceCollector,
} from "./stages.js";
import { mcpAdapters } from "../mcp/adapters.js";

export const PROMPT_VERSION = "equidox-ai-v2.0-pipeline";

function pipelineMode() {
  const m = String(process.env.AI_PIPELINE_MODE || "compact").toLowerCase();
  return m === "full" ? "full" : "compact";
}

function buildUserPrompt(context, evidence, briefings, skillIds) {
  const examples = loadFewShotExamples();
  return `## Milestone under review (acceptance criteria are authoritative)
${JSON.stringify(context.milestone, null, 2)}

## Grant context
${JSON.stringify(context.grant, null, 2)}

## Evidence collector
${JSON.stringify(evidence, null, 2)}

## Stage briefings
${JSON.stringify(briefings, null, 2)}

## Repository
${JSON.stringify(context.repository, null, 2)}

## README
${context.readme || ""}

## Documentation
${context.documentation?.text || ""}

## Commits
${JSON.stringify(context.commits || [], null, 2)}

## Pull requests
${JSON.stringify(context.pullRequests || [], null, 2)}

## Issues
${JSON.stringify(context.issues || [], null, 2)}

## Deployment
${context.deployment || "n/a"}

## File tree (sample)
${JSON.stringify(context.fileTree || [], null, 2)}

## Source files (sample)
${JSON.stringify(context.sourceFiles || [], null, 2)}

## Builder passport
${JSON.stringify(context.builderPassport || null, null, 2)}

## Previous reports (summaries)
${JSON.stringify(context.previousReports || [], null, 2)}

## Previous milestones
${JSON.stringify(context.previousMilestones || [], null, 2)}

## Loaded skills
${skillIds.join(", ")}

## Few-shot scoring style examples
${examples
  .map(
    (ex) =>
      `### ${ex.name}\n${JSON.stringify(
        {
          overallScore: ex.json.overallScore,
          recommendation: ex.json.recommendation,
          riskLevel: ex.json.riskLevel,
          criteriaChecklist: ex.json.criteriaChecklist,
          executiveSummary: ex.json.executiveSummary,
        },
        null,
        2
      )}`
  )
  .join("\n\n")}

Return ONLY the final JSON report matching output_schema.md.
Be skeptical. Cite evidence. Do not invent.
`;
}

async function callWithProviders(callChat, messages, opts) {
  return callChat(messages, opts);
}

async function selfReviewPass(callChat, report, context) {
  const messages = [
    {
      role: "system",
      content:
        "You are Equidox AI performing a self-audit of your own grant review. Return ONLY corrected JSON for the same schema. Fix unsupported claims. Do not invent new evidence.",
    },
    {
      role: "user",
      content: `Review your analysis JSON below against the evidence summary.

Did you assume facts not present?
Did you overestimate completion?
Did you miss security issues?
Did you ignore missing evidence?

Evidence digest:
- criteria: ${String(context.milestone?.acceptanceCriteria || "").slice(0, 800)}
- repo: ${context.repository?.url}
- hasTests: ${context.repository?.hasTests}
- deployment: ${context.deployment}
- missing github error: ${context.repository?.error || "none"}

Your draft JSON:
${JSON.stringify(report)}

Return corrected JSON only.`,
    },
  ];

  try {
    const result = await callChat(messages, { temperature: 0.1, jsonMode: true });
    const raw = extractJson(result.content);
    const validated = validateReport(raw);
    return {
      report: validated.report,
      meta: result,
      selfReviewed: true,
      repaired: validated.repaired,
    };
  } catch (err) {
    console.error("[ai] self-review failed:", err.message);
    return { report, selfReviewed: false, repaired: false };
  }
}

async function runFullStages(callChat, systemMessage, context, evidence) {
  const stageOutputs = { evidence };
  for (const stage of PIPELINE_STAGES.filter((s) => s !== "decision")) {
    const briefing = briefingForStage(stage, context);
    const messages = [
      { role: "system", content: systemMessage },
      {
        role: "user",
        content: `You are the ${stage} specialist stage.
Return ONLY JSON: {"stage":"${stage}","summary":"","findings":[],"score":0,"risks":[],"missingEvidence":[]}
Briefing: ${JSON.stringify(briefing)}
Milestone: ${JSON.stringify(context.milestone)}
Repository: ${JSON.stringify(context.repository)}
Evidence: ${JSON.stringify(evidence)}
`,
      },
    ];
    try {
      const result = await callChat(messages, { temperature: 0.15, jsonMode: true });
      stageOutputs[stage] = extractJson(result.content);
    } catch (err) {
      stageOutputs[stage] = {
        stage,
        summary: `Stage failed: ${err.message}`,
        findings: [],
        risks: [err.message],
        missingEvidence: [],
      };
    }
  }

  const decisionMessages = [
    { role: "system", content: systemMessage },
    {
      role: "user",
      content: `You are the Grant Decision Agent. Combine stage JSON into the FINAL report schema only.
Stages:
${JSON.stringify(stageOutputs, null, 2)}

Milestone:
${JSON.stringify(context.milestone, null, 2)}
`,
    },
  ];
  const decision = await callChat(decisionMessages, {
    temperature: 0.15,
    jsonMode: true,
  });
  return { raw: extractJson(decision.content), meta: decision, stageOutputs };
}

/**
 * Run the Equidox technical grant review pipeline.
 *
 * @param {object} input - legacy analyzeMilestone input shape
 * @param {{ callChatCompletionsChain: Function }} deps
 */
export async function runReviewPipeline(input = {}, deps = {}) {
  const { callChatCompletionsChain } = deps;
  if (typeof callChatCompletionsChain !== "function") {
    throw new Error("runReviewPipeline requires callChatCompletionsChain");
  }

  // MCP hook point: evidence may later come from MCP github adapter
  const context = buildReviewContext(input);
  await mcpAdapters.github.getRepoEvidence(async () => context.githubData);

  const fp = contextFingerprint(context);
  if (process.env.AI_CACHE_REPORTS !== "false") {
    const cached = analysisCache.get("report", fp);
    if (cached) {
      return {
        ...cached,
        cached: true,
        prompt_version: PROMPT_VERSION,
      };
    }
  }

  const { systemMessage, skillIds } = assembleSystemPrompt(context);
  const evidence = evidenceCollector(context);
  const briefings = PIPELINE_STAGES.map((s) => briefingForStage(s, context));
  const mode = pipelineMode();

  const callChat = (messages, opts) => callChatCompletionsChain(messages, opts);

  let raw;
  let meta;
  let stageOutputs = { evidence };

  if (mode === "full") {
    const full = await runFullStages(callChat, systemMessage, context, evidence);
    raw = full.raw;
    meta = full.meta;
    stageOutputs = full.stageOutputs;
  } else {
    const userPrompt = buildUserPrompt(context, evidence, briefings, skillIds);
    const messages = [
      { role: "system", content: systemMessage },
      { role: "user", content: userPrompt },
    ];
    meta = await callWithProviders(callChat, messages, {
      temperature: 0.15,
      jsonMode: true,
    });
    try {
      raw = extractJson(meta.content);
    } catch (err) {
      // repair: ask model once to fix JSON
      const repair = await callChat(
        [
          {
            role: "system",
            content: "Repair into valid JSON only matching the Equidox output schema.",
          },
          {
            role: "user",
            content: `Invalid output:\n${String(meta.content).slice(0, 12000)}\n\nError: ${err.message}`,
          },
        ],
        { temperature: 0, jsonMode: true }
      );
      raw = extractJson(repair.content);
      meta = repair;
    }
  }

  let validated = validateReport(raw);
  if (!validated.ok) {
    // retry once with validation feedback
    try {
      const retry = await callChat(
        [
          { role: "system", content: systemMessage },
          {
            role: "user",
            content: `Your previous JSON failed validation. Return corrected JSON only.\nIssues: ${validated.error?.message || "schema"}\nDraft: ${JSON.stringify(raw).slice(0, 8000)}`,
          },
        ],
        { temperature: 0, jsonMode: true }
      );
      validated = validateReport(extractJson(retry.content));
      meta = retry;
    } catch {
      // keep schema-safe fallback
    }
  }

  let report = validated.report;
  let selfReviewed = false;

  if (process.env.AI_SELF_REVIEW !== "false") {
    const sr = await selfReviewPass(callChat, report, context);
    report = sr.report;
    selfReviewed = sr.selfReviewed;
    if (sr.meta) meta = sr.meta;
  }

  const payload = {
    report,
    context,
    skillIds,
    stageOutputs,
    mode,
    selfReviewed,
    repaired: validated.repaired,
    meta: {
      latencyMs: meta?.latencyMs,
      tokens: meta?.tokens,
      model: meta?.model,
      providerId: meta?.providerId,
      providerName: meta?.providerName,
    },
    prompt_version: PROMPT_VERSION,
    cached: false,
  };

  if (process.env.AI_CACHE_REPORTS !== "false") {
    analysisCache.set("report", fp, payload);
  }

  // lightweight content caches for reuse
  analysisCache.set("readme", context.readme?.slice(0, 200), {
    chars: context.readme?.length || 0,
  });
  analysisCache.set(
    "repo",
    { url: context.repository?.url, push: context.repository?.lastPush },
    context.repository
  );

  return payload;
}
