/**
 * Fetches GitHub repository activity for milestone verification.
 * Uses GITHUB_TOKEN when available; otherwise returns mock data for development.
 */
export async function fetchGitHubEvidence(repoUrl) {
  const match = repoUrl?.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    return { error: "Invalid GitHub URL", commits: 0, openIssues: 0, lastPush: null };
  }

  const [, owner, repo] = match;
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
      mock: true,
    };
  }

  const [repoRes, commitsRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`, { headers }),
  ]);

  const repoData = await repoRes.json();
  const commits = await commitsRes.json();

  return {
    owner,
    repo,
    stars: repoData.stargazers_count,
    openIssues: repoData.open_issues_count,
    lastPush: repoData.pushed_at,
    recentCommits: Array.isArray(commits) ? commits.length : 0,
    mock: false,
  };
}
