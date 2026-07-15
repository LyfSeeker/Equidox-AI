import {
  getAiConfig,
  getFallbackProviders,
  getPrimaryProvider,
  getProviderById,
} from "./settings.js";
import {
  PROMPT_VERSION as PIPELINE_PROMPT_VERSION,
  runReviewPipeline,
} from "../../ai/index.js";

export const PROMPT_VERSION = PIPELINE_PROMPT_VERSION;

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number(n) || 0)));
}

function mapRecommendation(raw) {
  const r = String(raw || "")
    .toUpperCase()
    .replace(/\s+/g, "_");
  if (r.includes("APPROVE") && !r.includes("MANUAL")) return "approve";
  if (r.includes("REJECT")) return "reject";
  if (r.includes("MANUAL") || r.includes("REVIEW")) return "review";
  const lower = String(raw || "").toLowerCase();
  if (["approve", "reject", "review"].includes(lower)) return lower;
  return "review";
}


function mapChecklistStatus(row = {}) {
  const raw = String(row.status || row.State || "").toUpperCase().trim();
  if (["PASS", "FAIL", "PARTIAL", "NOT_VERIFIED"].includes(raw)) return raw;
  if (row.met === true) return "PASS";
  if (row.met === false) return "FAIL";
  return "NOT_VERIFIED";
}

function normalizeReport(raw, meta) {
  const nested = raw.scores && typeof raw.scores === "object" ? raw.scores : {};
  const recommendation = mapRecommendation(
    raw.recommendation || raw.recommended_action
  );

  const featureCompletion = clamp(
    nested.featureCompletion ??
      raw.featureCompletion ??
      raw.feature_completion_score ??
      raw.completionScore ??
      raw.completion_score
  );
  const codeQuality = clamp(
    nested.codeQuality ??
      raw.codeQuality ??
      raw.code_quality_score ??
      raw.codeQualityScore ??
      50
  );
  const security = clamp(
    nested.security ?? raw.security ?? raw.security_score ?? raw.securityScore ?? 50
  );
  const documentation = clamp(
    nested.documentation ??
      raw.documentation ??
      raw.documentation_score ??
      raw.documentationScore ??
      50
  );
  const testing = clamp(
    nested.testing ??
      raw.testing ??
      raw.testCoverage ??
      raw.test_coverage_score ??
      raw.testCoverageScore ??
      (meta.githubData?.hasTests ? 55 : 25)
  );
  const deployment = clamp(
    nested.deployment ??
      raw.deployment ??
      raw.deployment_score ??
      raw.deploymentScore ??
      50
  );
  const githubHealth = clamp(
    nested.githubHealth ??
      raw.githubHealth ??
      raw.github_health_score ??
      raw.githubHealthScore ??
      50
  );
  const innovation = clamp(
    nested.innovation ??
      raw.innovation ??
      raw.innovation_score ??
      raw.innovationScore ??
      50
  );
  const architecture = clamp(
    nested.architecture ??
      raw.architecture ??
      raw.architecture_score ??
      raw.architectureScore ??
      codeQuality
  );
  const maintainability = clamp(
    nested.maintainability ??
      raw.maintainability ??
      raw.maintainability_score ??
      50
  );

  const weighted = Math.round(
    featureCompletion * 0.3 +
      codeQuality * 0.2 +
      security * 0.15 +
      documentation * 0.1 +
      testing * 0.1 +
      deployment * 0.05 +
      githubHealth * 0.05 +
      innovation * 0.05
  );
  const score = clamp(
    raw.overallScore ?? raw.overall_score ?? raw.score ?? weighted
  );
  const riskScore = clamp(raw.riskScore ?? raw.risk_score);
  const confidenceScore = clamp(
    raw.confidenceScore ??
      raw.confidence_score ??
      Math.round((score + (100 - riskScore)) / 2)
  );

  const riskRaw = String(raw.riskLevel || raw.risk_level || "").toUpperCase();
  const riskLevel = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(riskRaw)
    ? riskRaw
    : riskScore >= 85
      ? "CRITICAL"
      : riskScore >= 70
        ? "HIGH"
        : riskScore >= 40
          ? "MEDIUM"
          : "LOW";

  const checklistSource = Array.isArray(raw.criteriaChecklist)
    ? raw.criteriaChecklist
    : Array.isArray(raw.criteria_checklist)
      ? raw.criteria_checklist
      : [];

  const criteriaChecklist = checklistSource.map((row) => {
    const status = mapChecklistStatus(row);
    return {
      criterion: String(row?.criterion || row?.criteria || row?.title || ""),
      status,
      reason: String(row?.reason || row?.notes || ""),
      // legacy UI fields
      met: status === "PASS" || status === "PARTIAL",
      notes: String(row?.reason || row?.notes || ""),
    };
  });

  const securityFindings = Array.isArray(raw.securityFindings)
    ? raw.securityFindings.map(String)
    : Array.isArray(raw.security_findings)
      ? raw.security_findings.map(String)
      : Array.isArray(raw.fraudSignals)
        ? raw.fraudSignals.map(String)
        : Array.isArray(raw.fraud_signals)
          ? raw.fraud_signals.map(String)
          : [];

  const recommendations = Array.isArray(raw.recommendations)
    ? raw.recommendations.map(String)
    : Array.isArray(raw.suggestions)
      ? raw.suggestions.map(String)
      : [];

  const executiveSummary =
    raw.executiveSummary ||
    raw.executive_summary ||
    raw.summary ||
    "Analysis complete.";
  const reviewerNotes =
    raw.reviewerNotes || raw.reviewer_notes || raw.reasoning || "";

  return {
    score,
    overall_score: score,
    code_quality_score: codeQuality,
    security_score: security,
    feature_completion_score: featureCompletion,
    documentation_score: documentation,
    test_coverage_score: testing,
    architecture_score: architecture,
    maintainability_score: maintainability,
    deployment_score: deployment,
    github_health_score: githubHealth,
    innovation_score: innovation,
    completion_score: featureCompletion,
    confidence_score: confidenceScore,
    risk_score: riskScore,
    trust_score: clamp(
      raw.trustScore ??
        raw.trust_score ??
        Math.round((score + confidenceScore + (100 - riskScore)) / 3)
    ),
    risk_level: riskLevel,
    strengths: Array.isArray(raw.strengths) ? raw.strengths.map(String) : [],
    weaknesses: Array.isArray(raw.weaknesses) ? raw.weaknesses.map(String) : [],
    missing_evidence: Array.isArray(raw.missingEvidence)
      ? raw.missingEvidence.map(String)
      : Array.isArray(raw.missing_evidence)
        ? raw.missing_evidence.map(String)
        : [],
    fraud_signals: securityFindings,
    security_findings: securityFindings,
    suggestions: recommendations,
    recommendations,
    criteria_checklist: criteriaChecklist,
    findings: [
      ...(Array.isArray(raw.strengths) ? raw.strengths.map((s) => `+ ${s}`) : []),
      ...(Array.isArray(raw.weaknesses)
        ? raw.weaknesses.map((w) => `- ${w}`)
        : []),
    ],
    summary: executiveSummary,
    executive_summary: executiveSummary,
    reasoning: reviewerNotes || executiveSummary,
    reviewer_notes: reviewerNotes,
    recommended_action: recommendation,
    recommendation: String(
      raw.recommendation || recommendation.toUpperCase()
    )
      .toUpperCase()
      .replace(/\s+/g, "_"),
    github: meta.githubData || null,
    documentation: meta.documentation || null,
    source: meta.providerName || meta.providerId || "ai",
    provider: meta.providerId || "ai",
    providerName: meta.providerName || meta.providerId || "ai",
    model: meta.model,
    prompt_version: PROMPT_VERSION,
    latency_ms: meta.latencyMs,
    tokens: meta.tokens,
    generated_at: new Date().toISOString(),
  };
}

function extractJson(content) {
  const text = String(content || "").trim();
  try {
    return JSON.parse(text);
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1].trim());
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("AI response was not valid JSON");
  }
}

function chatCompletionsUrl(baseUrl) {
  const base = String(baseUrl || "")
    .trim()
    .replace(/\/+$/, "");
  // OpenAI SDK style: base already includes /v1 → append /chat/completions
  // Gemini OpenAI-compat: .../v1beta/openai → append /chat/completions
  // Host-only style: https://api.example.com → append /v1/chat/completions
  if (/\/v1$/i.test(base) || /\/openai$/i.test(base)) {
    return `${base}/chat/completions`;
  }
  return `${base}/v1/chat/completions`;
}

function parseProviderError(providerName, status, text) {
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    // ignore
  }

  const providerMsg =
    parsed?.error?.message ||
    parsed?.error ||
    parsed?.message ||
    (typeof parsed?.error === "string" ? parsed.error : null) ||
    text;

  const msg = String(providerMsg || "").slice(0, 400);
  const lower = msg.toLowerCase();

  if (
    status === 402 ||
    status === 403 ||
    /insufficient|no credits|doesn't have any credits|permission-denied|billing|license/i.test(
      lower
    )
  ) {
    return {
      code: "PROVIDER_NO_CREDITS",
      message: `${providerName} account has no credits/license. Add billing in the provider console, then test again. (${msg})`,
    };
  }

  if (status === 401 || /invalid.?api.?key|unauthorized|incorrect api key/i.test(lower)) {
    return {
      code: "PROVIDER_BAD_KEY",
      message: `${providerName} rejected the API key. Check the key and try again.`,
    };
  }

  if (status === 404) {
    return {
      code: "PROVIDER_BAD_URL",
      message: `${providerName} endpoint not found (404). Check Base URL (for Grok use https://api.x.ai/v1) and model name.`,
    };
  }

  return {
    code: "PROVIDER_HTTP_ERROR",
    message: `${providerName} HTTP ${status}: ${msg}`,
  };
}

export async function callChatCompletions(
  provider,
  messages,
  { temperature = 0.2, jsonMode = true, maxTokens } = {}
) {
  if (!provider?.apiKey || !provider?.baseUrl || !provider?.model) {
    const err = new Error(
      `Provider "${provider?.name || provider?.id || "unknown"}" is not fully configured`
    );
    err.code = "AI_NOT_CONFIGURED";
    throw err;
  }

  const body = {
    model: provider.model,
    messages,
    temperature,
  };
  if (jsonMode) body.response_format = { type: "json_object" };
  if (maxTokens) body.max_tokens = maxTokens;

  const started = Date.now();
  let lastErr;
  const url = chatCompletionsUrl(provider.baseUrl);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`${provider.name} HTTP ${res.status}`);
        await new Promise((r) => setTimeout(r, attempt * 800));
        continue;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const parsed = parseProviderError(provider.name, res.status, text);
        const err = new Error(parsed.message);
        err.code = parsed.code;
        err.status = res.status;
        throw err;
      }

      const data = await res.json();
      return {
        content: data.choices?.[0]?.message?.content,
        latencyMs: Date.now() - started,
        tokens: {
          prompt: data.usage?.prompt_tokens ?? null,
          completion: data.usage?.completion_tokens ?? null,
          total: data.usage?.total_tokens ?? null,
        },
        model: provider.model,
        providerId: provider.id,
        providerName: provider.name,
      };
    } catch (err) {
      lastErr = err;
      console.error(
        `[ai] ${provider.id} attempt ${attempt} failed:`,
        err.message
      );
      // Don't retry auth/billing/client errors
      if (
        err.code === "PROVIDER_NO_CREDITS" ||
        err.code === "PROVIDER_BAD_KEY" ||
        err.code === "PROVIDER_BAD_URL" ||
        err.status === 400 ||
        err.status === 401 ||
        err.status === 402 ||
        err.status === 403
      ) {
        throw err;
      }
      if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 800));
    }
  }

  throw lastErr || new Error("AI request failed");
}

async function providersInOrder(preferredId) {
  const cfg = await getAiConfig();
  const ordered = [];
  if (preferredId) {
    const p = cfg.providers.find((x) => x.id === preferredId);
    if (p) ordered.push(p);
  }
  const primary = cfg.providers.find((x) => x.id === cfg.primaryProviderId);
  if (primary && !ordered.some((x) => x.id === primary.id)) ordered.push(primary);
  // Prefer Kimi / custom primary over Gemini/DeepSeek when both exist
  const preferredOrder = ["kimi", "custom", "deepseek", "openai", "gemini"];
  const rest = cfg.providers
    .filter((p) => !ordered.some((x) => x.id === p.id))
    .sort(
      (a, b) =>
        preferredOrder.indexOf(a.id) - preferredOrder.indexOf(b.id)
    );
  ordered.push(...rest);
  return ordered.filter((p) => p.apiKey && p.baseUrl && p.model);
}

/**
 * Analyze a milestone via Equidox AI review pipeline (prompts + skills + validation).
 */
export async function analyzeMilestone(input = {}) {
  const chain = await providersInOrder();
  if (!chain.length) {
    const err = new Error(
      "No AI provider configured. Set AI_API_KEY for Kimi (or GEMINI_API_KEY / DEEPSEEK_API_KEY / OPENAI_API_KEY) in backend/.env."
    );
    err.code = "AI_NOT_CONFIGURED";
    throw err;
  }

  async function callChatCompletionsChain(messages, opts = {}) {
    let lastErr;
    for (const provider of chain) {
      try {
        return await callChatCompletions(provider, messages, opts);
      } catch (err) {
        lastErr = err;
        console.error(`[ai] provider ${provider.id} failed:`, err.message);
      }
    }
    throw lastErr || new Error("All AI providers failed");
  }

  const pipeline = await runReviewPipeline(input, { callChatCompletionsChain });
  const raw = pipeline.report;
  const meta = pipeline.meta || {};

  const normalized = normalizeReport(raw, {
    githubData: input.githubData,
    documentation: input.documentation,
    latencyMs: meta.latencyMs,
    tokens: meta.tokens,
    model: meta.model,
    providerId: meta.providerId,
    providerName: meta.providerName,
  });

  return {
    ...normalized,
    prompt_version: PROMPT_VERSION,
    pipeline_mode: pipeline.mode,
    skills_loaded: pipeline.skillIds,
    self_reviewed: pipeline.selfReviewed,
    cached: pipeline.cached || false,
    technical_findings: raw.technicalFindings || [],
    architecture_review: raw.architectureReview || "",
    documentation_review: raw.documentationReview || "",
    testing_review: raw.testingReview || "",
    github_analysis: raw.githubAnalysis || "",
  };
}


export async function chatAboutReport({
  message,
  milestone,
  githubData,
  analysis,
  history = [],
}) {
  const system = `You are Equidox AI Copilot for grant reviewers.
Answer using ONLY the provided milestone, repository summary, and AI report context.
Be concise and specific. If something is unknown from the context, say so.
You do not release funds or make on-chain decisions.`;

  const context = {
    milestone,
    repository: {
      name: githubData?.name,
      stars: githubData?.stars,
      commits: githubData?.commits,
      hasTests: githubData?.hasTests,
      deployment: githubData?.deploymentUrl || githubData?.homepage,
    },
    report: {
      completion_score: analysis?.completion_score,
      confidence_score: analysis?.confidence_score,
      risk_score: analysis?.risk_score,
      trust_score: analysis?.trust_score,
      risk_level: analysis?.risk_level,
      recommendation: analysis?.recommendation || analysis?.recommended_action,
      summary: analysis?.executive_summary || analysis?.summary,
      reasoning: analysis?.reviewer_notes || analysis?.reasoning,
      strengths: analysis?.strengths,
      weaknesses: analysis?.weaknesses,
      missing_evidence: analysis?.missing_evidence,
      security_findings:
        analysis?.security_findings || analysis?.fraud_signals,
      fraud_signals: analysis?.fraud_signals,
      suggestions: analysis?.recommendations || analysis?.suggestions,
      criteria_checklist: analysis?.criteria_checklist,
    },
  };

  const messages = [
    { role: "system", content: system },
    {
      role: "system",
      content: `Context (JSON):\n${JSON.stringify(context).slice(0, 24000)}`,
    },
    ...history.slice(-6).map((h) => ({
      role: h.role === "assistant" ? "assistant" : "user",
      content: String(h.content || ""),
    })),
    { role: "user", content: String(message) },
  ];

  const chain = await providersInOrder();
  if (!chain.length) {
    const err = new Error("No AI provider configured");
    err.code = "AI_NOT_CONFIGURED";
    throw err;
  }

  const result = await callChatCompletions(chain[0], messages, {
    temperature: 0.4,
    jsonMode: false,
  });

  return {
    reply: result.content || "",
    model: result.model,
    provider: result.providerId,
    tokens: result.tokens,
  };
}

export async function testProvider(providerId) {
  const provider =
    (providerId && (await getProviderById(providerId))) ||
    (await getPrimaryProvider());
  if (!provider?.apiKey) {
    const err = new Error("Provider API key is not configured");
    err.code = "AI_NOT_CONFIGURED";
    throw err;
  }

  const result = await callChatCompletions(
    provider,
    [
      {
        role: "user",
        content: 'Reply with JSON only: {"ok":true,"message":"equidox-ai-ping"}',
      },
    ],
    { temperature: 0, jsonMode: false, maxTokens: 40 }
  );

  return {
    ok: true,
    provider: provider.id,
    name: provider.name,
    model: provider.model,
    baseUrl: provider.baseUrl,
    latencyMs: result.latencyMs,
    sample: result.content?.slice(0, 200) || null,
  };
}

export { getFallbackProviders, runReviewPipeline };
