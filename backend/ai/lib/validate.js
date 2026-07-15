import { emptySafeReport, reviewReportSchema } from "./schema.js";

export function extractJson(content) {
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

function coerceReport(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const nested = raw.scores && typeof raw.scores === "object" ? raw.scores : {};
  const statusMap = (row) => {
    const s = String(row?.status || "").toUpperCase();
    if (["PASS", "FAIL", "PARTIAL", "NOT_VERIFIED"].includes(s)) return s;
    if (row?.met === true) return "PASS";
    if (row?.met === false) return "FAIL";
    return "NOT_VERIFIED";
  };
  const rec = String(raw.recommendation || "")
    .toUpperCase()
    .replace(/\s+/g, "_");
  const recommendation = ["APPROVE", "MANUAL_REVIEW", "REJECT"].includes(rec)
    ? rec
    : "MANUAL_REVIEW";
  const risk = String(raw.riskLevel || "").toUpperCase();
  const riskLevel = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(risk)
    ? risk
    : "MEDIUM";

  const num = (v, d = 0) => {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.max(0, Math.min(100, Math.round(n)));
    return d;
  };

  return {
    overallScore: num(raw.overallScore ?? raw.overall_score ?? raw.score),
    trustScore: num(raw.trustScore ?? raw.trust_score),
    confidenceScore: num(raw.confidenceScore ?? raw.confidence_score),
    riskScore: num(raw.riskScore ?? raw.risk_score),
    riskLevel,
    recommendation,
    scores: {
      featureCompletion: num(
        nested.featureCompletion ?? raw.featureCompletion ?? raw.completion_score
      ),
      codeQuality: num(nested.codeQuality ?? raw.codeQuality, 50),
      architecture: num(nested.architecture ?? raw.architecture, 50),
      security: num(nested.security ?? raw.security, 50),
      documentation: num(nested.documentation ?? raw.documentation, 50),
      testing: num(nested.testing ?? raw.testing ?? raw.testCoverage, 25),
      deployment: num(nested.deployment ?? raw.deployment, 50),
      githubHealth: num(nested.githubHealth ?? raw.githubHealth, 50),
      innovation: num(nested.innovation ?? raw.innovation, 50),
      maintainability: num(nested.maintainability ?? raw.maintainability, 50),
    },
    criteriaChecklist: (
      raw.criteriaChecklist ||
      raw.criteria_checklist ||
      []
    ).map((row) => ({
      criterion: String(row?.criterion || row?.title || ""),
      status: statusMap(row),
      reason: String(row?.reason || row?.notes || "Not enough evidence."),
    })),
    executiveSummary: String(
      raw.executiveSummary || raw.summary || "Analysis complete."
    ),
    technicalFindings: Array.isArray(raw.technicalFindings)
      ? raw.technicalFindings.map(String)
      : [],
    architectureReview: String(raw.architectureReview || ""),
    securityFindings: Array.isArray(raw.securityFindings)
      ? raw.securityFindings.map(String)
      : Array.isArray(raw.fraudSignals)
        ? raw.fraudSignals.map(String)
        : [],
    documentationReview: String(raw.documentationReview || ""),
    testingReview: String(raw.testingReview || ""),
    githubAnalysis: String(raw.githubAnalysis || ""),
    strengths: Array.isArray(raw.strengths) ? raw.strengths.map(String) : [],
    weaknesses: Array.isArray(raw.weaknesses) ? raw.weaknesses.map(String) : [],
    missingEvidence: Array.isArray(raw.missingEvidence)
      ? raw.missingEvidence.map(String)
      : Array.isArray(raw.missing_evidence)
        ? raw.missing_evidence.map(String)
        : [],
    recommendations: Array.isArray(raw.recommendations)
      ? raw.recommendations.map(String)
      : Array.isArray(raw.suggestions)
        ? raw.suggestions.map(String)
        : [],
    reviewerNotes: String(raw.reviewerNotes || raw.reasoning || ""),
  };
}

/**
 * Validate model JSON. On failure: coerce → retry schema → safe fallback.
 */
export function validateReport(raw) {
  const coerced = coerceReport(raw);
  const parsed = reviewReportSchema.safeParse(coerced);
  if (parsed.success) return { ok: true, report: parsed.data, repaired: false };

  const second = reviewReportSchema.safeParse({
    ...emptySafeReport(),
    ...coerced,
    scores: { ...emptySafeReport().scores, ...(coerced?.scores || {}) },
  });
  if (second.success) return { ok: true, report: second.data, repaired: true };

  return {
    ok: false,
    report: emptySafeReport({
      executiveSummary: "Model output failed schema validation.",
      reviewerNotes: parsed.error?.message?.slice(0, 400) || "validation error",
    }),
    repaired: true,
    error: parsed.error,
  };
}
