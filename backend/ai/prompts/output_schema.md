# Equidox AI — Output JSON Schema

Return ONLY valid JSON. No markdown. No commentary.

```json
{
  "overallScore": 0,
  "trustScore": 0,
  "confidenceScore": 0,
  "riskScore": 0,
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "recommendation": "APPROVE|MANUAL_REVIEW|REJECT",
  "scores": {
    "featureCompletion": 0,
    "codeQuality": 0,
    "architecture": 0,
    "security": 0,
    "documentation": 0,
    "testing": 0,
    "deployment": 0,
    "githubHealth": 0,
    "innovation": 0,
    "maintainability": 0
  },
  "criteriaChecklist": [
    {
      "criterion": "string",
      "status": "PASS|FAIL|PARTIAL|NOT_VERIFIED",
      "reason": "string — cite evidence or say Not enough evidence."
    }
  ],
  "executiveSummary": "string",
  "technicalFindings": ["string"],
  "architectureReview": "string",
  "securityFindings": ["string"],
  "documentationReview": "string",
  "testingReview": "string",
  "githubAnalysis": "string",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "missingEvidence": ["string"],
  "recommendations": ["string"],
  "reviewerNotes": "string"
}
```

## Field rules

- All numeric scores: integers 0–100
- Arrays: use `[]` when empty — never omit
- Strings: non-empty where required (`executiveSummary`, `recommendation`, `riskLevel`)
- Every checklist item must map to acceptance criteria when provided
- Every score claim should be implied by findings / evidence referenced in text fields
