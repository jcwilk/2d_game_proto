---
id: 2gp-g5bi
status: open
deps: []
links: []
created: 2026-03-28T16:21:04Z
type: task
priority: 1
assignee: user.email
parent: 2gp-3y3y
---
# sprite-gen: logging module

Add **`tools/sprite-generation/logging.mjs`**: structured **`log(level, step, message, extra?)`** aligned with current **`tools/dpad-workflow.mjs`** logging (search structured log / timestamp prefix; plan cites ~**285–306** — line numbers approximate). Export the API for **`pipeline.mjs`**, generators, and QA bridge code paths that currently log.

**Scope:** Logging only — no pipeline logic.

## Acceptance criteria

- [ ] File exists at **`tools/sprite-generation/logging.mjs`** and is imported by downstream modules. **Interim:** **`dpad-workflow.mjs`** may keep inline logging until **2gp-b4lm**; after **2gp-b4lm**, the monolith must call the shared module (no duplicate logger).
- [ ] Log line shape and levels are **documented in the module** (if any field differs from the legacy lines 291–306, the delta is intentional and noted).
- [ ] No **network**, **fal**, or **filesystem** side effects inside the logger itself.
