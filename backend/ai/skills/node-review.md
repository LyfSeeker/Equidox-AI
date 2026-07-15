# Node.js / Express Review

## Best practices
- Layered routes/services
- Async error handling
- Input validation
- 12-factor config

## Common mistakes
- Unhandled rejections
- Blocking CPU on request path
- God routers

## Red flags
- eval on user input
- Hardcoded credentials

## Evaluation checklist
- [ ] Middleware order
- [ ] Timeouts
- [ ] Safe logging

## Scoring guidance
Backend features need reachable endpoints and error paths.

## Example observation
Unsanitized path writes — security finding.
