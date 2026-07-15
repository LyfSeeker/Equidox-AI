import { z } from "zod";

const checklistItem = z.object({
  criterion: z.string(),
  status: z.enum(["PASS", "FAIL", "PARTIAL", "NOT_VERIFIED"]),
  reason: z.string(),
});

const scores = z.object({
  featureCompletion: z.number().min(0).max(100),
  codeQuality: z.number().min(0).max(100),
  architecture: z.number().min(0).max(100).optional().default(50),
  security: z.number().min(0).max(100),
  documentation: z.number().min(0).max(100),
  testing: z.number().min(0).max(100),
  deployment: z.number().min(0).max(100),
  githubHealth: z.number().min(0).max(100),
  innovation: z.number().min(0).max(100),
  maintainability: z.number().min(0).max(100).optional().default(50),
});

export const reviewReportSchema = z.object({
  overallScore: z.number().min(0).max(100),
  trustScore: z.number().min(0).max(100),
  confidenceScore: z.number().min(0).max(100),
  riskScore: z.number().min(0).max(100),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  recommendation: z.enum(["APPROVE", "MANUAL_REVIEW", "REJECT"]),
  scores,
  criteriaChecklist: z.array(checklistItem).default([]),
  executiveSummary: z.string().min(1),
  technicalFindings: z.array(z.string()).default([]),
  architectureReview: z.string().default(""),
  securityFindings: z.array(z.string()).default([]),
  documentationReview: z.string().default(""),
  testingReview: z.string().default(""),
  githubAnalysis: z.string().default(""),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  missingEvidence: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  reviewerNotes: z.string().default(""),
});

export const stageFindingSchema = z.object({
  stage: z.string(),
  summary: z.string().default(""),
  findings: z.array(z.string()).default([]),
  score: z.number().min(0).max(100).optional(),
  risks: z.array(z.string()).default([]),
  missingEvidence: z.array(z.string()).default([]),
});

/** Schema-safe empty / fallback report */
export function emptySafeReport(partial = {}) {
  return reviewReportSchema.parse({
    overallScore: 0,
    trustScore: 0,
    confidenceScore: 0,
    riskScore: 100,
    riskLevel: "CRITICAL",
    recommendation: "REJECT",
    scores: {
      featureCompletion: 0,
      codeQuality: 0,
      architecture: 0,
      security: 0,
      documentation: 0,
      testing: 0,
      deployment: 0,
      githubHealth: 0,
      innovation: 0,
      maintainability: 0,
    },
    criteriaChecklist: [],
    executiveSummary: "Analysis failed or returned invalid JSON.",
    technicalFindings: [],
    architectureReview: "",
    securityFindings: [],
    documentationReview: "",
    testingReview: "",
    githubAnalysis: "",
    strengths: [],
    weaknesses: ["Invalid or unusable model output"],
    missingEvidence: ["Valid structured AI response"],
    recommendations: ["Retry analysis"],
    reviewerNotes: "Schema-safe fallback.",
    ...partial,
  });
}
