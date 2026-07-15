/**
 * Build one structured review context object from evidence inputs.
 */
export function buildReviewContext(input = {}) {
  const github = input.githubData || input.github || {};
  const milestone = input.milestone || {};
  const documentation = input.documentation || {};

  const acceptanceCriteria =
    milestone.acceptanceCriteria ||
    milestone.description ||
    input.milestoneDescription ||
    "";

  const context = {
    grant: milestone.grant || input.grant || null,
    milestone: {
      id: milestone.id || null,
      title: milestone.title || input.milestoneTitle || null,
      acceptanceCriteria,
      description: milestone.description || acceptanceCriteria,
      amount: milestone.amount ?? milestone.amount_stroops ?? input.milestoneAmount ?? null,
      status: milestone.status || null,
    },
    builderNotes: milestone.notes || input.notes || null,
    repository: {
      url: github.htmlUrl || github.url || milestone.repoUrl || input.repoUrl || null,
      owner: github.owner || null,
      name: github.name || github.repo || null,
      description: github.description || null,
      stars: github.stars ?? null,
      forks: github.forks ?? null,
      languages: github.languages || {},
      ageDays: github.ageDays ?? null,
      createdAt: github.createdAt || null,
      lastPush: github.lastPush || null,
      hasTests: Boolean(github.hasTests),
      testPaths: github.testPaths || [],
      packageJsonPresent: Boolean(github.packageJson || github.packageJsonPresent),
      dockerfilePresent: Boolean(github.dockerfile || github.dockerfilePresent),
      workflowFiles: github.workflowFiles || [],
      singleHugeCommit: Boolean(github.singleHugeCommit),
      error: github.error || null,
    },
    readme: String(input.readme || github.readme || "").slice(0, 12000),
    commits: (input.commits || github.commitDetails || github.recentCommitMessages || []).slice(0, 40),
    pullRequests: (input.pullRequests || github.pullRequests || []).slice(0, 20),
    issues: (input.issues || github.issues || []).slice(0, 20),
    fileTree: (input.fileTree || github.fileTree || github.treeSample || []).slice(0, 200),
    sourceFiles: (input.sourceFiles || github.sourceFiles || [])
      .slice(0, 12)
      .map((f) => ({
        path: f.path,
        content: String(f.content || "").slice(0, 6000),
      })),
    deployment:
      input.deployment ||
      milestone.demoUrl ||
      github.deploymentUrl ||
      github.homepage ||
      null,
    documentation: {
      url: typeof documentation === "object" ? documentation.url || documentation.docsUrl : null,
      text: String(
        typeof documentation === "string"
          ? documentation
          : documentation?.text || ""
      ).slice(0, 8000),
    },
    builderPassport: input.builderPassport || input.passport || null,
    previousReports: input.previousReports || [],
    previousMilestones: input.previousMilestones || [],
    githubData: github,
  };

  return context;
}

export function contextFingerprint(context) {
  const key = JSON.stringify({
    repo: context.repository?.url,
    push: context.repository?.lastPush,
    criteria: context.milestone?.acceptanceCriteria,
    treeCount: context.fileTree?.length,
    commitCount: context.commits?.length,
  });
  return Buffer.from(key).toString("base64url").slice(0, 64);
}
