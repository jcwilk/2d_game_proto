---
id: 2gp-veak
status: closed
deps: [2gp-gwjc]
links: []
created: 2026-04-19T03:02:23Z
type: task
priority: 0
assignee: user.email
parent: 2gp-czux
---
# PNG analyze stack → TypeScript (paths + analyze-bridge contract)

Migrate **tools/png-analyze** (CLI), **tools/png-analyze-metrics**, and **tools/png-analyze-metrics.test** from **.mjs** to **.ts**. Update **package.json** scripts and any spawn/exec callers.

**Ownership split with `2gp-bdeg` (B5):** this ticket owns **zero** stale **png-analyze\*.mjs** entrypoint references and correct spawn argv / golden strings in bridge tests (**analyze-bridge.spawn.test.mjs**, **analyze-bridge.integration.test.mjs**) while the bridge **implementation file** may still be **.mjs**. **`2gp-bdeg`** owns migrating **qa/analyze-bridge** implementation and tests to **.ts** without re-breaking entrypoints established here.

Mandatory: **rg** for `png-analyze\.mjs` (and path segments) and update **all** hits in first-party **tools/**, **src/**, tests, and operator docs (**tools/README.md**, **tools/sprite-generation/README.md**) so nothing still documents or spawns removed **.mjs** entrypoints. Paths must match the runner documented in **`2gp-gwjc`**.

## Acceptance Criteria

**rg** `png-analyze\.mjs` over repo (excluding **node_modules**, vendored **scripts/ticket**) has no hits that imply a removed **.mjs** entrypoint; **package.json** scripts use the **`2gp-gwjc`** runner pattern; **png-analyze** / **png-analyze-metrics** tests pass under **npm test**.

