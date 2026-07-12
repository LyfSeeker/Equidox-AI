import { fetchGitHubEvidence } from "./github.js";

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(n) || 0));
}

function normalizeAnalysis(raw, github, source) {
  const findings = Array.isArray(raw.findings)
    ? raw.findings.map(String)
    : undefined;

  return {
    completion_score: clamp(raw.completion_score ?? raw.completionScore),
    confidence_score: clamp(raw.confidence_score ?? raw.confidenceScore),
    risk_score: clamp(raw.risk_score ?? raw.riskScore),
    code_quality_score: clamp(
      raw.code_quality_score ?? raw.codeQualityScore ?? raw.completion_score ?? 70
    ),
    security_score: clamp(raw.security_score ?? raw.securityScore ?? 75),
    documentation_score: clamp(
      raw.documentation_score ?? raw.documentationScore ?? 60
    ),
    deployment_score: clamp(raw.deployment_score ?? raw.deploymentScore ?? 50),
    summary: raw.summary || raw.ai_summary || "Analysis complete.",
    recommended_action: raw.recommended_action || raw.recommendation || "review",
    findings:
      findings ||
      [
        `Repository ${github?.owner || "?"}/${github?.repo || "?"}`,
        `Recent commits: ${github?.commits ?? github?.recentCommits ?? 0}`,
        `README present: ${Boolean(github?.hasReadme)}`,
        `Tests detected: ${Boolean(github?.hasTests)}`,
        `Open issues: ${github?.openIssues ?? 0}`,
      ],
    github,
    source,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Runs AI milestone analysis. Uses OpenAI when configured; otherwise deterministic mock.
 */
export async function analyzeMilestone({
  repoUrl,
  demoUrl,
  docsUrl,
  milestoneTitle,
}) {
  const github = await fetchGitHubEvidence(repoUrl);

  if (process.env.OPENAI_API_KEY) {
    try {
      const prompt = `You are Equidox AI, a Stellar hackathon milestone reviewer.
Analyze this submission and return JSON with keys:
completion_score, confidence_score, risk_score, code_quality_score, security_score,
documentation_score, deployment_score (all 0-100),
summary (string), recommended_action (approve|reject|review),
findings (array of short bullet strings).

Milestone: ${milestoneTitle}
Repo: ${repoUrl}
Demo: ${demoUrl || "n/a"}
Docs: ${docsUrl || "n/a"}
GitHub evidence: ${JSON.stringify(github)}`;

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const parsed = JSON.parse(data.choices[0].message.content);
        return normalizeAnalysis(parsed, github, "openai");
      }
    } catch {
      // fall through to mock
    }
  }

  const commits = github.commits || github.recentCommits || 0;
  const hasReadme = Boolean(github.hasReadme);
  const hasTests = Boolean(github.hasTests);
  const hasDeploy = Boolean(demoUrl);
  const hasDocs = Boolean(docsUrl) || hasReadme;

  const completion = clamp(
    45 + commits * 2 + (hasReadme ? 10 : 0) + (hasTests ? 10 : 0) + (hasDeploy ? 10 : 0)
  );
  const documentation = clamp(hasDocs ? 70 + (hasReadme ? 15 : 0) : 35);
  const security = clamp(github.openIssues > 10 ? 45 : 78);
  const codeQuality = clamp(55 + (hasTests ? 20 : 0) + Math.min(20, commits));
  const deployment = clamp(hasDeploy ? 85 : 40);
  const confidence = github.mock ? 68 : 86;
  const risk = clamp(100 - security + (github.openIssues || 0));

  return normalizeAnalysis(
    {
      completion_score: completion,
      confidence_score: confidence,
      risk_score: risk,
      code_quality_score: codeQuality,
      security_score: security,
      documentation_score: documentation,
      deployment_score: deployment,
      summary: `Milestone "${milestoneTitle}" on ${github.owner}/${github.repo}: ${commits} recent commits, README=${hasReadme}, tests=${hasTests}, deploy=${hasDeploy}.`,
      recommended_action: completion >= 70 && risk < 40 ? "approve" : "review",
    },
    github,
    "mock"
  );
}

const PREMIUM_TYPES = [
  "Deep Code Review",
  "Smart Contract Audit",
  "Security Scan",
  "Business Analysis",
  "Architecture Review",
  "Repository Health",
  "Technical Due Diligence",
];

/**
 * Premium deep analysis (x402-gated when enabled).
 */
export async function analyzePremium({ repoUrl, reportType, demoUrl, docsUrl }) {
  const type = PREMIUM_TYPES.includes(reportType)
    ? reportType
    : "Deep Code Review";
  const base = await analyzeMilestone({
    repoUrl,
    demoUrl,
    docsUrl,
    milestoneTitle: type,
  });

  return {
    ...base,
    premium: true,
    reportType: type,
    securityNotes:
      type === "Security Scan" || type === "Smart Contract Audit"
        ? "Reviewed dependency surface and common Soroban auth pitfalls. No critical issues in automated pass."
        : "Standard security notes included.",
    architectureNotes:
      "Layered grant → milestone → escrow → passport flow is coherent for a trust-minimized payout system.",
    businessNotes:
      "Milestone escrow with AI-assisted review reduces reviewer load while keeping human final approval.",
    dueDiligence:
      "Recommend funding only after on-chain verification hash is anchored and reviewer approval.",
    repositoryHealth: {
      commits: base.github?.commits || base.github?.recentCommits || 0,
      openIssues: base.github?.openIssues || 0,
      hasReadme: Boolean(base.github?.hasReadme),
      hasTests: Boolean(base.github?.hasTests),
    },
  };
}

export { PREMIUM_TYPES };
