---
id: 2gp-muyg
status: open
deps: [2gp-b4lm]
links: []
created: 2026-03-28T16:21:36Z
type: chore
priority: 2
assignee: user.email
parent: 2gp-3y3y
---
# sprite-gen: document tools/README and npm scripts

Update **`tools/README.md`** after the library lands:

- Document **`tools/sprite-generation/`** module layout (mirror the plan’s tree: **`pipeline.mjs`**, **`generators/`**, **`postprocess/`**, **`qa/`**, **`presets/`**).
- Document **Vitest** coverage: tests live under **`tools/**/*.test.mjs`** (existing **`vitest.config.ts`** **`include`**); **no live image generation in tests**.
- Document **`npm run mock:dpad-workflow`** (runs **`tools/dpad-workflow.mjs --mode mock`**) and **`npm run dpad-workflow`**; note **`tools/mock-dpad-workflow.mjs`** shim.

**`package.json`:** Add or adjust scripts **only if** needed for discoverability (e.g. **`test:tools`** alias); otherwise state explicitly that **`npm test`** already runs **`tools/**/*.test.mjs`**.

## Acceptance criteria

- [ ] **`tools/README.md`** sections for **`dpad-workflow`** / mock pipeline reference **`tools/sprite-generation/`** and link to preset **`presets/dpad.mjs`**.
- [ ] **`package.json`** changes (if any) are **minimal** and described in the PR/commit body; if **no script changes**, the close note says **“no package.json change required.”**
