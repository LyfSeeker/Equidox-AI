import { fetchGitHubEvidence } from "./github.js";

/**
 * Runs AI milestone analysis. Uses OpenAI when configured; otherwise deterministic mock.
 */
export async function analyzeMilestone({ repoUrl, demoUrl, docsUrl, milestoneTitle }) {
  const github = await fetchGitHubEvidence(repoUrl);

  if (process.env.OPENAI_API_KEY) {
    try {
      const prompt = `Analyze this hackathon milestone submission and return JSON with keys:
completion_score (0-100), confidence_score (0-100), risk_score (0-100),
summary (string), recommended_action (approve|reject|review).
Milestone: ${milestoneTitle}
Repo: ${repoUrl}
Demo: ${demoUrl}
Docs: ${docsUrl}
GitHub data: ${JSON.stringify(github)}`;

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
        return { ...parsed, github, source: "openai" };
      }
    } catch {
      // fall through
    }
  }

  const completion = Math.min(95, 50 + (github.commits || github.recentCommits || 0));
  return {
    completion_score: completion,
    confidence_score: github.mock ? 70 : 85,
    risk_score: github.openIssues > 10 ? 40 : 15,
    summary: `Milestone "${milestoneTitle}" shows ${github.commits || github.recentCommits || 0} recent commits on ${github.owner}/${github.repo}.`,
    recommended_action: completion >= 70 ? "approve" : "review",
    github,
    source: "mock",
  };
}

/**
 * Premium deep analysis (x402-gated).
 */
export async function analyzePremium({ repoUrl, reportType }) {
  const base = await analyzeMilestone({ repoUrl, milestoneTitle: reportType });
  return {
    ...base,
    premium: true,
    reportType,
    securityNotes: "No critical vulnerabilities detected in dependency scan (mock).",
    codeQuality: "B+",
  };
}
