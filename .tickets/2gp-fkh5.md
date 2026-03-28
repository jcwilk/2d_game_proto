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

**Normative:** **`.cursor/plans/project-implementation-deep-dive.md`** §E.5.1 (vision step, structured outputs, policies). **`OPENAI_API_KEY`** only in Node/tooling—never in the Vite client.

## Design

Implement under `tools/` (exact filename in closure notes). `OPENAI_VISION_MODEL` (or equivalent) selects the model. No OpenAI SDK imports under `src/`.

## Acceptance Criteria

1) Vision model is configurable via environment (e.g. `OPENAI_VISION_MODEL`). 2) When **`OPENAI_API_KEY`** is unset, the script **exits 0** and prints a clear **skipped** message **or** `tools/README.md` documents the exact behavior. 3) `rg` (or repo search) shows **no** `openai` package imports and **no** OpenAI client usage under `src/`. 4) `tools/README.md` names the chosen API surface (**Chat Completions** *or* **Responses**, not both) and links OpenAI **data / API** policy for sending pixels to OpenAI (§E.5.1). 5) Closure notes name the API surface and the pinned **model** string, and state that the model supports **vision + structured outputs** together per §E.5.1 (use **web-research** subagent if the model matrix is unclear before closing).

