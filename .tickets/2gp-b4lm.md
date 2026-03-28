---
id: 2gp-b4lm
status: closed
deps: [2gp-mwst]
links: []
created: 2026-03-28T16:21:10Z
type: task
priority: 1
assignee: user.email
parent: 2gp-3y3y
---
# sprite-gen: rewire dpad-workflow CLI

Replace the body of **`tools/dpad-workflow.mjs`** with a **thin CLI**: parse args / **`printHelp`** preserving **current UX** (options, defaults, `--help` text parity unless intentionally improved), import **`createPreset`** from **`presets/dpad.mjs`**, call **`runPipeline`** from **`pipeline.mjs`**.

**`tools/mock-dpad-workflow.mjs`:** Remains a **shim** that spawns **`dpad-workflow.mjs --mode mock`** (see existing file). After rewire, **`npm run mock:dpad-workflow`** and **`node tools/mock-dpad-workflow.mjs`** must remain **valid entry points** with the **same argv forwarding** semantics.

## Acceptance criteria

- [ ] **`npm run mock:dpad-workflow`** and **`npm run dpad-workflow -- --help`** exercise the new code path.
- [ ] **`tools/dpad-workflow.mjs`** line count is **dramatically reduced** vs the pre-refactor monolith (order-of-magnitude smaller; exact threshold in close note).
- [ ] **`dpad-workflow.mjs`** imports and uses **`tools/sprite-generation/logging.mjs`** — **no** duplicate inline logger left (closes **2gp-g5bi** interim duplication).
- [ ] **`mock-dpad-workflow.mjs`** still forwards to **`dpad-workflow.mjs`** with **`--mode mock`** (or updated equivalent documented in close note).
- [ ] No new business logic in the CLI file — **delegation only**.
