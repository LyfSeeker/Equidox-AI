import { cacheWrap } from "./cache.js";
import { getAiConfig } from "./settings.js";

const SOURCE_EXTS = new Set([
  ".rs",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".go",
  ".sol",
  ".java",
  ".kt",
  ".swift",
  ".rb",
  ".php",
  ".cs",
  ".cpp",
  ".c",
  ".h",
  ".hpp",
  ".vue",
  ".svelte",
]);

const SKIP_PATH =
  /(^|\/)(node_modules|dist|build|\.next|target|vendor|\.git|coverage|__pycache__|\.turbo)(\/|$)/i;

const PRIORITY_PATH =
  /(^|\/)(src|lib|app|contracts|backend|frontend|server|pkg|internal|core)(\/|$)|readme|package\.json|cargo\.toml|go\.mod|dockerfile|main\.|index\.|lib\.rs|mod\.rs/i;

function parseRepo(repoUrl) {
  const match = repoUrl?.match(/github\.com\/([^/]+)\/([^/#?]+)/);
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ""),
    fullName: `${match[1]}/${match[2].replace(/\.git$/, "")}`,
  };
}

export { parseRepo };

async function ghHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "equidox-ai",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const cfg = await getAiConfig();
  if (cfg.githubToken) {
    headers.Authorization = `Bearer ${cfg.githubToken}`;
  }
  return headers;
}

async function ghJson(url) {
  const res = await fetch(url, { headers: await ghHeaders() });
  if (res.status === 403 || res.status === 429) {
    const err = new Error(`GitHub rate limited (${res.status})`);
    err.code = "GITHUB_RATE_LIMIT";
    err.status = res.status;
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`GitHub ${res.status} for ${url}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function ghTextOptional(url) {
  try {
    const res = await fetch(url, { headers: await ghHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.content && data?.encoding === "base64") {
      return Buffer.from(data.content, "base64").toString("utf8");
    }
    return null;
  } catch {
    return null;
  }
}

function extOf(path) {
  const i = path.lastIndexOf(".");
  return i >= 0 ? path.slice(i).toLowerCase() : "";
}

/**
 * Pick representative source files from the tree for AI code review.
 * Prefers src/lib/contracts and common entrypoints; skips vendored/build dirs.
 */
function selectSourcePaths(paths, { maxFiles = 12 } = {}) {
  const candidates = paths
    .filter((p) => p && !SKIP_PATH.test(p) && SOURCE_EXTS.has(extOf(p)))
    .filter((p) => !/\.(min|bundle|map)\./i.test(p));

  const scored = candidates.map((path) => {
    let score = 0;
    if (PRIORITY_PATH.test(path)) score += 10;
    if (/test|spec|__tests__/i.test(path)) score += 4;
    if (/security|auth|crypto|wallet|contract/i.test(path)) score += 5;
    // Prefer mid-sized path depth (not root dumps, not deeply nested noise)
    const depth = path.split("/").length;
    if (depth >= 2 && depth <= 5) score += 2;
    return { path, score };
  });

  scored.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  return scored.slice(0, maxFiles).map((s) => s.path);
}

async function fetchSourceFiles(base, paths) {
  const selected = selectSourcePaths(paths);
  const files = [];
  // Sequential batches of 4 to stay gentle on GitHub rate limits
  for (let i = 0; i < selected.length; i += 4) {
    const batch = selected.slice(i, i + 4);
    const parts = await Promise.all(
      batch.map(async (path) => {
        const text = await ghTextOptional(
          `${base}/contents/${path.split("/").map(encodeURIComponent).join("/")}`
        );
        if (!text) return null;
        return {
          path,
          content: String(text).slice(0, 8000),
          bytes: text.length,
        };
      })
    );
    for (const f of parts) if (f) files.push(f);
  }
  return files;
}

/**
 * Full GitHub repository analysis for milestone verification.
 * Pipeline: URL → owner/repo → metadata, languages, tree, sources,
 * commits, PRs, issues, README.
 */
export async function fetchGitHubEvidence(repoUrl) {
  const parsed = parseRepo(repoUrl);
  if (!parsed) {
    return {
      error: "Invalid GitHub URL",
      owner: null,
      repo: null,
      commits: 0,
      openIssues: 0,
      lastPush: null,
      hasReadme: false,
      hasTests: false,
      languages: {},
      treeSample: [],
      fileTree: [],
      sourceFiles: [],
      name: null,
    };
  }

  const { owner, repo } = parsed;
  const cacheKey = `gh:full:v2:${owner}/${repo}`;

  try {
    return await cacheWrap(cacheKey, 5 * 60 * 1000, async () => {
      const base = `https://api.github.com/repos/${owner}/${repo}`;

      const [
        repoData,
        commits,
        languages,
        contributors,
        pulls,
        issues,
        treeJson,
        readmeText,
        packageJson,
        dockerfile,
        workflows,
      ] = await Promise.all([
        ghJson(base),
        ghJson(`${base}/commits?per_page=30`).catch(() => []),
        ghJson(`${base}/languages`).catch(() => ({})),
        ghJson(`${base}/contributors?per_page=20`).catch(() => []),
        ghJson(`${base}/pulls?state=all&per_page=20`).catch(() => []),
        ghJson(`${base}/issues?state=all&per_page=20`).catch(() => []),
        ghJson(`${base}/git/trees/HEAD?recursive=1`).catch(() => ({ tree: [] })),
        ghTextOptional(`${base}/contents/README.md`).then(async (t) => {
          if (t) return t;
          return ghTextOptional(`${base}/readme`).catch(() => null);
        }),
        ghTextOptional(`${base}/contents/package.json`),
        ghTextOptional(`${base}/contents/Dockerfile`),
        ghJson(`${base}/contents/.github/workflows`).catch(() => null),
      ]);

      const treeEntries = Array.isArray(treeJson.tree) ? treeJson.tree : [];
      const paths = treeEntries.map((t) => t.path).filter(Boolean);
      const hasTests = paths.some((p) =>
        /test|spec|__tests__|\.test\.|\.spec\.|cargo test|pytest|jest|vitest/i.test(
          p
        )
      );
      const commitList = Array.isArray(commits) ? commits : [];
      const pullList = Array.isArray(pulls) ? pulls : [];
      const issueList = Array.isArray(issues)
        ? issues.filter((i) => !i.pull_request)
        : [];
      const contributorList = Array.isArray(contributors) ? contributors : [];

      let workflowFiles = [];
      if (Array.isArray(workflows)) {
        workflowFiles = workflows
          .filter((f) => f.type === "file")
          .map((f) => f.name);
      }

      const sourceFiles = await fetchSourceFiles(base, paths);

      const homepage = repoData.homepage || null;
      const createdAt = repoData.created_at;
      const ageDays = createdAt
        ? Math.floor(
            (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
          )
        : null;

      const singleHugeCommit =
        commitList.length === 1 ||
        (commitList.length > 0 &&
          commitList.length <= 2 &&
          (repoData.size || 0) > 5000);

      const testPaths = paths
        .filter((p) => /test|spec|__tests__|\.test\.|\.spec\./i.test(p))
        .slice(0, 40);

      return {
        owner,
        repo,
        name: repoData.full_name || `${owner}/${repo}`,
        description: repoData.description,
        stars: repoData.stargazers_count ?? 0,
        forks: repoData.forks_count ?? 0,
        openIssues: repoData.open_issues_count ?? 0,
        lastPush: repoData.pushed_at,
        createdAt,
        ageDays,
        defaultBranch: repoData.default_branch,
        homepage,
        deploymentUrl: homepage,
        // Architecture evidence pack
        metadata: {
          fullName: repoData.full_name,
          description: repoData.description,
          stars: repoData.stargazers_count ?? 0,
          forks: repoData.forks_count ?? 0,
          sizeKb: repoData.size ?? 0,
          defaultBranch: repoData.default_branch,
          license: repoData.license?.spdx_id || null,
          topics: repoData.topics || [],
        },
        languages: languages || {},
        commits: commitList.length,
        recentCommits: commitList.length,
        recentCommitMessages: commitList
          .slice(0, 15)
          .map((c) => c.commit?.message?.split("\n")[0] || "")
          .filter(Boolean),
        commitDetails: commitList.slice(0, 15).map((c) => ({
          sha: c.sha?.slice(0, 7),
          message: c.commit?.message?.split("\n")[0],
          author: c.commit?.author?.name,
          date: c.commit?.author?.date,
        })),
        contributors: contributorList.slice(0, 15).map((c) => ({
          login: c.login,
          contributions: c.contributions,
        })),
        pullRequests: pullList.slice(0, 15).map((p) => ({
          number: p.number,
          title: p.title,
          state: p.state,
          merged_at: p.merged_at,
        })),
        issues: issueList.slice(0, 15).map((i) => ({
          number: i.number,
          title: i.title,
          state: i.state,
        })),
        hasReadme: Boolean(readmeText),
        readme: (readmeText || "").slice(0, 20_000),
        hasTests,
        testPaths,
        treeSample: paths.slice(0, 80),
        fileTree: paths.slice(0, 120),
        sourceFiles,
        sourceFileCount: sourceFiles.length,
        packageJson: packageJson
          ? String(packageJson).slice(0, 4000)
          : null,
        dockerfile: dockerfile ? String(dockerfile).slice(0, 3000) : null,
        workflowFiles,
        singleHugeCommit,
        sizeKb: repoData.size ?? 0,
        mock: false,
        cached: false,
      };
    });
  } catch (err) {
    console.error("[github] analysis failed:", err.message);
    return {
      owner,
      repo,
      name: `${owner}/${repo}`,
      commits: 0,
      openIssues: 0,
      hasReadme: false,
      hasTests: false,
      languages: {},
      treeSample: [],
      fileTree: [],
      sourceFiles: [],
      readme: "",
      pullRequests: [],
      issues: [],
      contributors: [],
      error: err.message,
      rateLimited: err.code === "GITHUB_RATE_LIMIT",
      mock: false,
    };
  }
}
