/**
 * Review pipeline stages.
 *
 * Evidence stages are deterministic (no LLM).
 * Specialist stages may be:
 *  - compact: contribute briefing text for a single synthesis call
 *  - full: each issues its own LLM call (AI_PIPELINE_MODE=full)
 */

export function evidenceCollector(context) {
  return {
    stage: "evidence",
    summary: "Structured evidence pack assembled from GitHub, docs, and milestone.",
    findings: [
      `Repo: ${context.repository?.url || "n/a"}`,
      `Criteria length: ${String(context.milestone?.acceptanceCriteria || "").length}`,
      `Commits sampled: ${(context.commits || []).length}`,
      `Source files sampled: ${(context.sourceFiles || []).length}`,
      `Deployment: ${context.deployment || "n/a"}`,
      `Has tests signal: ${Boolean(context.repository?.hasTests)}`,
      `Dockerfile signal: ${Boolean(context.repository?.dockerfilePresent)}`,
    ],
    risks: context.repository?.singleHugeCommit
      ? ["singleHugeCommit signal present"]
      : [],
    missingEvidence: [
      !context.deployment ? "Deployment URL" : null,
      !context.readme ? "README" : null,
      context.repository?.error ? `GitHub error: ${context.repository.error}` : null,
    ].filter(Boolean),
  };
}

export function briefingForStage(stage, context) {
  const m = context.milestone || {};
  const r = context.repository || {};
  switch (stage) {
    case "architecture":
      return {
        stage,
        focus: "module boundaries, FE/BE/chain split, maintainability",
        hints: [
          `packageJson=${r.packageJsonPresent}`,
          `languages=${JSON.stringify(r.languages || {})}`,
          `treeSample=${(context.fileTree || []).slice(0, 30).map((x) => x.path || x).join(",")}`,
        ],
      };
    case "security":
      return {
        stage,
        focus: "secrets, authz, money-path, injectable inputs, contract auth",
        hints: [
          `singleHugeCommit=${r.singleHugeCommit}`,
          `sourceSampleCount=${(context.sourceFiles || []).length}`,
        ],
      };
    case "code":
      return {
        stage,
        focus: "code quality, readability, error handling, TypeScript/React/Node idioms",
        hints: [`sourceFiles=${(context.sourceFiles || []).map((f) => f.path).join(",")}`],
      };
    case "testing":
      return {
        stage,
        focus: "unit/integration presence, seriousness, CI",
        hints: [
          `hasTests=${r.hasTests}`,
          `testPaths=${(r.testPaths || []).join(",")}`,
          `workflows=${(r.workflowFiles || []).join(",")}`,
        ],
      };
    case "documentation":
      return {
        stage,
        focus: "README operability, docs URL content, setup clarity",
        hints: [
          `readmeChars=${(context.readme || "").length}`,
          `docsChars=${(context.documentation?.text || "").length}`,
        ],
      };
    case "decision":
      return {
        stage,
        focus: "grant criteria checklist + APPROVE|MANUAL_REVIEW|REJECT",
        hints: [
          `title=${m.title}`,
          `criteria=${String(m.acceptanceCriteria || "").slice(0, 500)}`,
        ],
      };
    default:
      return { stage, focus: stage, hints: [] };
  }
}

export const PIPELINE_STAGES = [
  "architecture",
  "security",
  "code",
  "testing",
  "documentation",
  "decision",
];
