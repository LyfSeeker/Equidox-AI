# Testing Review

## Best practices
- Unit + integration for money/auth paths
- CI running tests
- Stable fixtures

## Common mistakes
- Assert-true tests
- Silently skipped suites

## Red flags
- No tests for escrow/payout claims

## Evaluation checklist
- [ ] Test directories
- [ ] CI workflows
- [ ] Coverage claims vs reality

## Scoring guidance
Low score when criteria demand tests but none exist.

## Example observation
Criteria require unit tests; no test files — criterion FAIL.
