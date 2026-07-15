# Equidox AI layer (production grant reviewer)

Modular, evidence-first technical review stack used by `backend/src/services/llm.js`.

## Layout

```
ai/
  prompts/     # system, reviewer, scoring, decision_rules, output_schema
  skills/      # technology skills (loaded dynamically)
  examples/    # few-shot APPROVE / MANUAL_REVIEW / REJECT
  lib/         # context builder, skill loader, zod validation, cache helpers
  mcp/         # MCP adapters with REST fallbacks
  pipeline/    # evidence → specialist briefings → decision (+ optional full stages)
```

## Pipeline modes

| Env | Behavior |
|-----|----------|
| `AI_PIPELINE_MODE=compact` (default) | Evidence + dynamic skills + one synthesis LLM call + self-review |
| `AI_PIPELINE_MODE=full` | Per-stage LLM specialist calls, then decision agent |

Other flags:

- `AI_SELF_REVIEW=false` — skip self-audit pass
- `AI_CACHE_REPORTS=false` — disable report fingerprint cache

## MCP

Register a client later:

```js
import { registerMcpClient } from "./index.js";
registerMcpClient("github", mcpGithubClient);
```

Adapters fall back to existing REST/GitHub collectors when MCP is absent.

## Compatibility

`runReviewPipeline` returns structured data normalized by `llm.js` into the existing `analyzeMilestone` API / UI report shape.
