# Architecture Review

## Best practices
- Clear FE/BE/chain boundaries
- Single-responsibility modules
- Observable failures

## Common mistakes
- Circular deps
- Business logic only in UI

## Red flags
- No separation for money-critical paths

## Evaluation checklist
- [ ] Folder layout
- [ ] Service layers
- [ ] On-chain vs off-chain split

## Scoring guidance
Score coherence of structure.

## Example observation
AI, chain, and HTTP mixed in one file — maintainability hit.
