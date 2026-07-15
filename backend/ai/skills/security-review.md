# Security Review

## Best practices
- Secret management
- AuthZ checks
- Input validation
- Least privilege

## Common mistakes
- Trusting client roles
- Logging tokens

## Red flags
- Private keys in repo
- Unauth fund movement

## Evaluation checklist
- [ ] .env.example without secrets
- [ ] Auth middleware
- [ ] Wallet handling

## Scoring guidance
List concrete issues; absence of signals is not proof of security.

## Example observation
User-signed Freighter txs are good; custodial keys would be critical.
