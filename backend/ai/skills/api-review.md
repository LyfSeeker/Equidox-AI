# API Design Review

## Best practices
- Consistent paths
- Auth on mutating routes
- Clear error envelopes

## Common mistakes
- Inconsistent statuses
- Silent 500s

## Red flags
- Unauthenticated admin endpoints
- CORS * with credentials

## Evaluation checklist
- [ ] Endpoint inventory
- [ ] Auth gates
- [ ] Validation

## Scoring guidance
API completeness vs acceptance criteria.

## Example observation
Verify endpoint exists without auth — at least MANUAL_REVIEW.
