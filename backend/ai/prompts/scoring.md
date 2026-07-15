# Equidox AI — Scoring Rubrics (0–100)

All category scores are integers 0–100. Justify with evidence. Missing evidence caps scores and reduces confidence.

## Weights (for overallScore when synthesizing)

| Category | Weight |
|----------|--------|
| Feature Completion | 30% |
| Code Quality | 15% |
| Architecture | 10% |
| Security | 15% |
| Documentation | 8% |
| Testing | 8% |
| Deployment | 4% |
| GitHub Health | 4% |
| Innovation | 3% |
| Maintainability | 3% |

---

## Feature Completion (30%)

Does evidence satisfy the milestone **acceptance criteria**?

- 90–100: Every criterion verified with strong evidence
- 70–89: Most criteria met; minor gaps or PARTIAL items
- 40–69: Partial delivery; material criteria unfinished
- 10–39: Mostly missing; weak or unrelated evidence
- 0–9: No credible progress on the criteria

## Code Quality (15%)

Structure, readability, naming, modularity, error handling, consistency.

- Red flags: duplicated blobs, dead code, ignore errors silently, secrets in source

## Architecture (10%)

Boundaries, separation of concerns, scalability hints, appropriate layering for the stack.

## Security (15%)

Authz/authn, input validation, secrets/env handling, dependency risks, blockchain money-path risks.

- Cap low if contract/money flows lack checks or keys are committed

## Documentation (8%)

README quality, install/run, architecture notes, API docs where relevant.

## Testing (8%)

Unit/integration tests present and serious; CI signals; manual verification evidence.

- “No tests found” should score low unless criteria explicitly waive tests

## Deployment (4%)

Live demo URL, Docker/Compose, CI/CD, env configuration evidence.

## GitHub Health (4%)

Meaningful commit history, PRs, consistent development, not a single dump commit.

## Innovation (3%)

Technical complexity and sound engineering choices — only when evidenced.

## Maintainability (3%)

Ease of change: config hygiene, modularity, operational clarity.

## Aggregate scores

- **overallScore**: weighted blend (rounded)
- **trustScore**: delivery trustworthiness given evidence completeness
- **confidenceScore**: how sure you are (missing evidence → lower)
- **riskScore**: higher = riskier (security + fraud + incomplete delivery)
