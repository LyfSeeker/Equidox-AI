import { createHash } from "crypto";
import { fetchGitHubEvidence } from "./github.js";
import { fetchDocumentation } from "./docs.js";
import {
  analyzeMilestone as providerAnalyze,
  chatAboutReport,
  PROMPT_VERSION,
} from "./llm.js";

/**
 * Full evidence pack + AI analysis via configured providers.
 */
export async function analyzeMilestone({
  repoUrl,
  demoUrl,
  docsUrl,
  milestoneTitle,
  milestoneDescription,
  milestoneAmount,
  markdownDocs,
  pdfText,
  milestone,
} = {}) {
  const github = await fetchGitHubEvidence(repoUrl);
  const documentation = await fetchDocumentation({
    docsUrl,
    markdownText: markdownDocs,
    pdfText,
  });

  const milestonePayload =
    milestone ||
    {
      title: milestoneTitle,
      acceptanceCriteria: milestoneDescription || null,
      description: milestoneDescription || null,
      amount: milestoneAmount || null,
      repoUrl,
      demoUrl: demoUrl || null,
      docsUrl: docsUrl || null,
    };

  // Always surface acceptance criteria explicitly for the model
  if (
    milestonePayload &&
    typeof milestonePayload === "object" &&
    !milestonePayload.acceptanceCriteria
  ) {
    milestonePayload.acceptanceCriteria =
      milestonePayload.description || milestoneDescription || "";
  }

  const input = {
    milestone: milestonePayload,
    githubData: github,
    documentation,
    deployment: demoUrl || github.deploymentUrl || github.homepage || null,
    commits: github.commitDetails || github.recentCommitMessages || [],
    pullRequests: github.pullRequests || [],
    issues: github.issues || [],
    readme: github.readme || "",
    fileTree: github.fileTree || github.treeSample || [],
    sourceFiles: github.sourceFiles || [],
  };

  const report = await providerAnalyze(input);
  return {
    ...report,
    github,
    documentation,
    deployment: input.deployment,
    prompt_version: PROMPT_VERSION,
  };
}

export function hashReport(report) {
  const canonical = JSON.stringify(report);
  return createHash("sha256").update(canonical).digest("hex");
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
  };
}

export { chatAboutReport, PREMIUM_TYPES, PROMPT_VERSION };
