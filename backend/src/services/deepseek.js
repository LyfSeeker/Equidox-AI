/**
 * Generic OpenAI-compatible chat client (DeepSeek, OpenAI, custom gateways).
 */
import {
  getAiConfig,
  getFallbackProviders,
  getPrimaryProvider,
  getProviderById,
} from "./settings.js";

export const PROMPT_VERSION = "equidox-arch-v2";

const SYSTEM_PROMPT = `You are the Equidox AI technical reviewer for Stellar grant milestones.

Pipeline you support:
1) Builder submits a GitHub repo URL
2) System extracts owner/repository and gathers GitHub evidence
3) You score the submission across fixed categories
4) A human reviewer then Release Funds or Reject on-chain (you never move funds)

Evidence you receive may include: repository metadata, languages, file tree,
source file contents, commits, pull requests, issues, and README.

Score these categories (integers 0-100):
- codeQuality: code clarity, structure, maintainability
- security: auth, secrets, unsafe patterns, contract/money risks
- featureCompletion: whether milestone features appear implemented
- documentation: README + docs quality and completeness
- testCoverage: presence and seriousness of tests (not a measured %)
- architecture: module boundaries, separation of concerns, scalability
- score: overall 0-100 weighted judgment of milestone readiness

Also set recommendation: APPROVE | MANUAL_REVIEW | REJECT (advisory only).

Rules:
- Do not hallucinate. If evidence is missing, say so and lower scores.
- Be objective and conservative.
- Flag fraud / weak-evidence signals.
- You do NOT approve payments.

Fraud / risk signals:
- Very few commits, empty repo, copied/generic README
- No tests, no deployment for a large milestone
- Single huge commit dumping all code
- Very recent inactive repository

Return ONLY valid JSON (no markdown fences) with this exact shape:
{
  "score": 0,
  "codeQuality": 0,
  "security": 0,
  "featureCompletion": 0,
  "documentation": 0,
  "testCoverage": 0,
  "architecture": 0,
  "completionScore": 0,
  "confidenceScore": 0,
  "riskScore": 0,
  "trustScore": 0,
  "riskLevel": "Low" | "Medium" | "High",
  "strengths": [],
  "weaknesses": [],
  "missingEvidence": [],
  "fraudSignals": [],
  "summary": "",
  "reasoning": "",
  "recommendation": "APPROVE" | "MANUAL_REVIEW" | "REJECT",
  "suggestions": []
}

Scores are integers 0-100.
featureCompletion should match completionScore.
score is the primary overall milestone score.
riskScore: higher = riskier.
trustScore: overall trustworthiness.`;

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

function buildUserPrompt(input) {
  const {
    milestone,
    githubData,
    documentation,
    deployment,
    commits,
    pullRequests,
    issues,
    readme,
    fileTree,
    sourceFiles,
  } = input;

  const milestoneBlock =
    typeof milestone === "string"
      ? milestone
      : JSON.stringify(milestone || {}, null, 2);

  const sources = (sourceFiles || githubData?.sourceFiles || [])
    .slice(0, 12)
    .map((f) => ({
      path: f.path,
      content: String(f.content || "").slice(0, 6000),
    }));

  return `Milestone
${milestoneBlock}

Repository metadata
${JSON.stringify(
  {
    owner: githubData?.owner,
    repo: githubData?.repo,
    name: githubData?.name,
    description: githubData?.description,
    stars: githubData?.stars,
    forks: githubData?.forks,
    languages: githubData?.languages,
    contributors: githubData?.contributors,
    ageDays: githubData?.ageDays,
    createdAt: githubData?.createdAt,
    lastPush: githubData?.lastPush,
    hasTests: githubData?.hasTests,
    testPaths: githubData?.testPaths,
    sizeKb: githubData?.sizeKb,
    workflowFiles: githubData?.workflowFiles,
    packageJsonPresent: Boolean(githubData?.packageJson),
    dockerfilePresent: Boolean(githubData?.dockerfile),
    singleHugeCommit: githubData?.singleHugeCommit,
    sourceFileCount: githubData?.sourceFileCount ?? sources.length,
    error: githubData?.error,
  },
  null,
  2
)}

Languages
${JSON.stringify(githubData?.languages || {}, null, 2)}

README
${(readme || githubData?.readme || "").slice(0, 12000)}

Documentation
${(typeof documentation === "string"
  ? documentation
  : documentation?.text || ""
).slice(0, 8000)}

Recent Commits
${JSON.stringify(commits || githubData?.commitDetails || githubData?.recentCommitMessages || [], null, 2)}

Pull Requests
${JSON.stringify(pullRequests || githubData?.pullRequests || [], null, 2)}

Issues
${JSON.stringify(issues || githubData?.issues || [], null, 2)}

Deployment
${deployment || githubData?.deploymentUrl || githubData?.homepage || "n/a"}

File tree (sample)
${JSON.stringify(fileTree || githubData?.fileTree || githubData?.treeSample || [], null, 2)}

Source files (selected for review)
${JSON.stringify(sources, null, 2)}

Return ONLY JSON with score + category scores.`;
}

function normalizeReport(raw, meta) {
  const recommendation = mapRecommendation(
    raw.recommendation || raw.recommended_action
  );
  const featureCompletion = clamp(
    raw.featureCompletion ??
      raw.feature_completion_score ??
      raw.completionScore ??
      raw.completion_score
  );
  const codeQuality = clamp(
    raw.codeQuality ?? raw.code_quality_score ?? raw.codeQualityScore ?? 50
  );
  const security = clamp(
    raw.security ?? raw.security_score ?? raw.securityScore ?? 50
  );
  const documentation = clamp(
    raw.documentation ??
      raw.documentation_score ??
      raw.documentationScore ??
      50
  );
  const testCoverage = clamp(
    raw.testCoverage ??
      raw.test_coverage_score ??
      raw.testCoverageScore ??
      (meta.githubData?.hasTests ? 55 : 25)
  );
  const architecture = clamp(
    raw.architecture ??
      raw.architecture_score ??
      raw.architectureScore ??
      50
  );
  const categoryAvg = Math.round(
    (codeQuality +
      security +
      featureCompletion +
      documentation +
      testCoverage +
      architecture) /
      6
  );
  const score = clamp(raw.score ?? raw.overall_score ?? categoryAvg);
  const riskScore = clamp(raw.riskScore ?? raw.risk_score);
  const confidenceScore = clamp(
    raw.confidenceScore ?? raw.confidence_score ?? Math.round((score + (100 - riskScore)) / 2)
  );
  const riskLevel =
    raw.riskLevel ||
    (riskScore >= 70 ? "High" : riskScore >= 40 ? "Medium" : "Low");

  return {
    // Primary architecture score
    score,
    overall_score: score,
    // Category scores (architecture diagram)
    code_quality_score: codeQuality,
    security_score: security,
    feature_completion_score: featureCompletion,
    documentation_score: documentation,
    test_coverage_score: testCoverage,
    architecture_score: architecture,
    // Legacy / secondary fields
    completion_score: featureCompletion,
    confidence_score: confidenceScore,
    risk_score: riskScore,
    trust_score: clamp(
      raw.trustScore ??
        raw.trust_score ??
        Math.round((score + confidenceScore + (100 - riskScore)) / 3)
    ),
    deployment_score: clamp(
      raw.deployment_score ?? raw.deploymentScore ?? 50
    ),
    risk_level: riskLevel,
    strengths: Array.isArray(raw.strengths) ? raw.strengths.map(String) : [],
    weaknesses: Array.isArray(raw.weaknesses) ? raw.weaknesses.map(String) : [],
    missing_evidence: Array.isArray(raw.missingEvidence)
      ? raw.missingEvidence.map(String)
      : Array.isArray(raw.missing_evidence)
        ? raw.missing_evidence.map(String)
        : [],
    fraud_signals: Array.isArray(raw.fraudSignals)
      ? raw.fraudSignals.map(String)
      : Array.isArray(raw.fraud_signals)
        ? raw.fraud_signals.map(String)
        : [],
    suggestions: Array.isArray(raw.suggestions)
      ? raw.suggestions.map(String)
      : [],
    findings: [
      ...(Array.isArray(raw.strengths) ? raw.strengths.map((s) => `+ ${s}`) : []),
      ...(Array.isArray(raw.weaknesses)
        ? raw.weaknesses.map((w) => `- ${w}`)
        : []),
    ],
    summary: raw.summary || "Analysis complete.",
    reasoning: raw.reasoning || raw.summary || "",
    recommended_action: recommendation,
    recommendation: String(
      raw.recommendation || recommendation.toUpperCase()
    ).toUpperCase(),
    github: meta.githubData || null,
    documentation: meta.documentation || null,
    source: meta.providerName || meta.providerId || "ai",
    provider: meta.providerId || "ai",
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
  // Host-only style: https://api.deepseek.com → append /v1/chat/completions
  if (/\/v1$/i.test(base)) return `${base}/chat/completions`;
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
  for (const p of cfg.providers) {
    if (!ordered.some((x) => x.id === p.id)) ordered.push(p);
  }
  return ordered.filter((p) => p.apiKey && p.baseUrl && p.model);
}

/**
 * Analyze a milestone — tries primary then other configured providers.
 */
export async function analyzeMilestone(input = {}) {
  const userPrompt = buildUserPrompt(input);
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  const chain = await providersInOrder();
  if (!chain.length) {
    const err = new Error(
      "No AI provider configured. Set DEEPSEEK_API_KEY (or OPENAI_API_KEY / AI_API_KEY) in backend/.env."
    );
    err.code = "AI_NOT_CONFIGURED";
    throw err;
  }

  let lastErr;
  for (const provider of chain) {
    try {
      const result = await callChatCompletions(provider, messages, {
        temperature: 0.2,
        jsonMode: true,
      });
      const parsed = extractJson(result.content);
      return normalizeReport(parsed, {
        githubData: input.githubData,
        documentation: input.documentation,
        latencyMs: result.latencyMs,
        tokens: result.tokens,
        model: result.model,
        providerId: result.providerId,
        providerName: result.providerName,
      });
    } catch (err) {
      lastErr = err;
      console.error(`[ai] provider ${provider.id} failed:`, err.message);
    }
  }

  throw lastErr || new Error("All AI providers failed");
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
      summary: analysis?.summary,
      reasoning: analysis?.reasoning,
      strengths: analysis?.strengths,
      weaknesses: analysis?.weaknesses,
      missing_evidence: analysis?.missing_evidence,
      fraud_signals: analysis?.fraud_signals,
      suggestions: analysis?.suggestions,
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

export { SYSTEM_PROMPT, buildUserPrompt, getFallbackProviders };
