# Docker Review

## Best practices
- Multi-stage builds
- Non-root user
- Pinned bases
- .dockerignore

## Common mistakes
- Secrets in image
- Running as root
- Huge build context

## Red flags
- ENV secrets in Dockerfile
- Unnecessary public DB ports

## Evaluation checklist
- [ ] Dockerfile vs claims
- [ ] Compose healthchecks

## Scoring guidance
Deployment score only if Docker artifacts exist and look usable.

## Example observation
README claims Docker but no Dockerfile — missing evidence.
