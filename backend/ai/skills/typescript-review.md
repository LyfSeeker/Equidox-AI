# TypeScript Review

## Best practices
- Strict types
- Shared DTOs
- Avoid any
- Runtime validation at boundaries

## Common mistakes
- as any escapes
- Loosely typed API payloads

## Red flags
- Widespread @ts-ignore
- Strict mode disabled without reason

## Evaluation checklist
- [ ] tsconfig strictness
- [ ] API edge typing

## Scoring guidance
Types improve maintainability; absence alone is not REJECT.

## Example observation
Public API accepts any JSON — recommend schema validation.
