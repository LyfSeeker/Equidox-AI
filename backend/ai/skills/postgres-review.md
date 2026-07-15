# PostgreSQL Review

## Best practices
- Migrations
- Parameterized queries
- Indexes for hot paths
- Least privilege

## Common mistakes
- String-concat SQL
- No migrations

## Red flags
- SQL injection
- World-writable roles

## Evaluation checklist
- [ ] Migration files
- [ ] Query patterns in samples

## Scoring guidance
Data layer maturity feeds architecture and security.

## Example observation
Template-string SQL from request — security FAIL.
