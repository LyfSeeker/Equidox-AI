/**
 * Detect relevant skill IDs from repository signals.
 * Does NOT load every skill — only those indicated by evidence.
 */
export function detectTechnologies(context = {}) {
  const github = context.github || context.githubData || {};
  const tree = [
    ...(github.fileTree || github.treeSample || context.fileTree || []),
  ].map((x) => String(x.path || x).toLowerCase());
  const langs = Object.keys(github.languages || {}).map((l) =>
    String(l).toLowerCase()
  );
  const pkg = Boolean(github.packageJson || github.packageJsonPresent);
  const dockerfile = Boolean(
    github.dockerfile || github.dockerfilePresent
  );
  const has = (re) => tree.some((p) => re.test(p)) || langs.some((l) => re.test(l));

  const ids = new Set(["grant-review", "github-review", "documentation-review"]);

  if (pkg || has(/package\.json$/)) {
    ids.add("node-review");
    ids.add("api-review");
  }
  if (has(/tsconfig/) || has(/\.tsx?$/) || langs.includes("typescript")) {
    ids.add("typescript-review");
  }
  if (
    has(/next\.config/) ||
    has(/(^|\/)app\//) ||
    has(/(^|\/)pages\//)
  ) {
    ids.add("nextjs-review");
    ids.add("react-review");
  } else if (has(/react/) || langs.includes("javascript")) {
    ids.add("react-review");
  }
  if (dockerfile || has(/dockerfile/) || has(/docker-compose/)) {
    ids.add("docker-review");
  }
  if (has(/migrat/) || has(/\.sql$/) || has(/postgres/) || has(/supabase/)) {
    ids.add("postgres-review");
  }
  if (
    has(/cargo\.toml/) ||
    has(/\.rs$/) ||
    langs.includes("rust")
  ) {
    ids.add("rust-review");
  }
  if (
    has(/soroban/) ||
    has(/grant.manager/) ||
    has(/builder.passport/) ||
    has(/contracts\//)
  ) {
    ids.add("soroban-review");
    ids.add("stellar-review");
    ids.add("rust-review");
  }
  if (has(/stellar/) || has(/freighter/) || has(/horizon/)) {
    ids.add("stellar-review");
  }
  if (
    github.hasTests ||
    has(/test/) ||
    has(/spec\./) ||
    has(/__tests__/)
  ) {
    ids.add("testing-review");
  }
  ids.add("security-review");
  ids.add("architecture-review");

  return [...ids];
}
