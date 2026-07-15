# Soroban / Smart Contract Review

## Best practices
- Auth on state changes
- Auditable events
- Clear status machines
- Double-pay guards

## Common mistakes
- Missing require_auth
- Unbounded storage growth

## Red flags
- Anyone can release funds

## Evaluation checklist
- [ ] Grant flows
- [ ] Milestone states
- [ ] Escrow token handling

## Scoring guidance
For Stellar grants, contract correctness is central to trust.

## Example observation
Release without approve evidence — cap security and feature scores.
