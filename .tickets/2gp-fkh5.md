---
id: 2gp-fkh5
status: open
deps: [2gp-04c6, 2gp-edpj]
links: []
created: 2026-03-28T03:23:57Z
type: feature
priority: 2
assignee: user.email
parent: 2gp-c9u6
---
# Add optional OpenAI vision QA script with structured JSON output

OPENAI_API_KEY in Node only; Chat vs Responses pick one §E.5.1. Skip if no key.

## Design

tools/; OPENAI_VISION_MODEL env; no OpenAI in src/.

## Acceptance Criteria

1) Vision model configurable via env (e.g. `OPENAI_VISION_MODEL`). 2) With no key, script exits 0 with a clear “skipped” message (or behavior documented in `tools/README.md`). 3) **`rg` / search**: no `openai` package imports or OpenAI client usage under `src/` (client bundle). 4) **`tools/README.md`**: names chosen **Chat Completions vs Responses** API surface; links OpenAI data/API policy for third-party processing of pixels (plan §E.5.1). 5) **Closure notes** (or README) record the chosen API surface and confirm the pinned model supports **vision + structured outputs** together, per plan §E.5.1 (spawn **web-research** if model capability matrix is unclear).

