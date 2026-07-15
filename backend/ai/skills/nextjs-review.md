# Next.js Review

## Best practices
- App Router conventions
- Server/client split
- Safe env usage
- Protected sensitive routes

## Common mistakes
- Everything client-side unnecessarily
- Fetching secrets on the client

## Red flags
- API keys in NEXT_PUBLIC_*
- Admin routes without auth

## Evaluation checklist
- [ ] Routing
- [ ] Middleware
- [ ] Config hygiene

## Scoring guidance
Tie feature claims to routes that exist.

## Example observation
Admin pages without auth gate — security/feature impact.
