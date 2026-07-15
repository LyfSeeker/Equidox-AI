# Equidox AI — Decision Rules

Recommendation must be exactly one of:

`APPROVE` | `MANUAL_REVIEW` | `REJECT`

## APPROVE

All of the following:

- Acceptance criteria largely satisfied (few/no FAIL; PARTIAL only if minor)
- Evidence is strong and specific
- No major security blockers
- **confidenceScore > 80**
- riskLevel is LOW or at most MEDIUM with clear mitigations noted

## MANUAL_REVIEW

Any of:

- Evidence incomplete or ambiguous
- Deployment unavailable when claimed
- Some criteria PARTIAL / NOT_VERIFIED
- Security concerns that need human judgment
- **confidenceScore between 50 and 80** (inclusive)

## REJECT

Any of:

- Acceptance criteria clearly not met
- Critical evidence missing for claimed delivery
- Project mostly incomplete relative to criteria
- Serious security issues
- Strong fraud / weak-evidence signals
- **confidenceScore below 50**

## Notes

- Prefer MANUAL_REVIEW over APPROVE when unsure.
- Prefer REJECT over MANUAL_REVIEW when criteria are clearly unmet with adequate evidence of absence.
- Recommendation is **advisory**; humans move funds.
