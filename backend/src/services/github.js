/**
 * Fetches GitHub repository activity for milestone verification.
 * Uses GITHUB_TOKEN when available; otherwise returns enriched mock data.
 */
export async function fetchGitHubEvidence(repoUrl) {
  const match = repoUrl?.match(/github\.com\/([^/]+)\/([^/#?]+)/);
  if (!match) {
    return {
      error: "Invalid GitHub URL",
      commits: 0,
      openIssues: 0,
      lastPush: null,
      hasReadme: false,
      hasTests: false,
      languages: {},
      treeSample: [],
    };
  }

  const [, owner, rawRepo] = match;
  const repo = rawRepo.replace(/\.git$/, "");
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "equidox-ai",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  if (!process.env.GITHUB_TOKEN) {
    return {
      owner,
      repo,
      commits: 42,
      openIssues: 3,
      lastPush: new Date().toISOString(),
      hasReadme: true,
      hasTests: true,
      languages: { Rust: 60, TypeScript: 40 },
      treeSample: ["contracts/", "backend/", "frontend/", "README.md"],
      mock: true,
    };
  }

  try {
    const [repoRes, commitsRes, readmeRes, languagesRes, treeRes] =
      await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
        fetch(
          `https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`,
          { headers }
        ),
        fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
          headers,
        }),
        fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, {
          headers,
        }),
        fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
          { headers }
        ),
      ]);

    const repoData = await repoRes.json();
    const commits = await commitsRes.json();
    const languages = languagesRes.ok ? await languagesRes.json() : {};
    const treeJson = treeRes.ok ? await treeRes.json() : { tree: [] };
    const paths = Array.isArray(treeJson.tree)
      ? treeJson.tree.map((t) => t.path).filter(Boolean)
      : [];

    const hasTests = paths.some((p) =>
      /test|spec|__tests__|\.test\.|\.spec\./i.test(p)
    );
    const treeSample = paths.slice(0, 40);

    return {
      owner,
      repo,
      stars: repoData.stargazers_count,
      openIssues: repoData.open_issues_count,
      lastPush: repoData.pushed_at,
      description: repoData.description,
      defaultBranch: repoData.default_branch,
      commits: Array.isArray(commits) ? commits.length : 0,
      recentCommits: Array.isArray(commits) ? commits.length : 0,
      recentCommitMessages: Array.isArray(commits)
        ? commits.slice(0, 5).map((c) => c.commit?.message?.split("\n")[0])
        : [],
      hasReadme: readmeRes.ok,
      hasTests,
      languages,
      treeSample,
      mock: false,
    };
  } catch (err) {
    return {
      owner,
      repo,
      commits: 0,
      openIssues: 0,
      hasReadme: false,
      hasTests: false,
      error: err.message,
      mock: true,
    };
  }
}
