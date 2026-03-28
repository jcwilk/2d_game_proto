---
id: 2gp-98mn
status: closed
deps: [2gp-g5bi, 2gp-mzk3, 2gp-5ixa, 2gp-h68c, 2gp-y83w, 2gp-s1lz, 2gp-3xsk]
links: []
created: 2026-03-28T16:21:08Z
type: feature
priority: 1
assignee: user.email
parent: 2gp-3y3y
---
# sprite-gen: pipeline orchestrator

Add **`tools/sprite-generation/pipeline.mjs`**: **`runPipeline(preset, opts)`** runs stages **in order**: **prompt → generator → postprocess → QA (optional) → manifest + sprite-ref writes**, using **`logging.mjs`** for structured logs.

**Sheet vs per-tile (plan):** Orchestrator must support both paths the monolith exposes:

- **`per-tile`**: one **`generate()`** call per frame (mock or fal).
- **`sheet`**: **`generateSheet()`** (fal) then **deterministic crops** into frames using preset **`sheet.size`** and **`sheet.crops`** (or equivalent); mock mode behavior matches **`dpad-workflow`** today (typically per-tile mock unless preset defines sheet mock).

**CLI flags** mirrored through **`opts`**: mock vs generate, **`--strategy`**, dry-run, skip-QA, chroma overrides, seed — **no duplicate business logic** left in **`dpad-workflow.mjs`** after **2gp-b4lm**.

## Acceptance criteria

- [ ] **Depends on:** **2gp-g5bi**, **2gp-mzk3**, **2gp-5ixa**, **2gp-h68c**, **2gp-y83w**, **2gp-s1lz**, **2gp-3xsk** (all merged).
- [ ] **Vitest integration test** under **`tools/sprite-generation/pipeline.test.mjs`**: **mock** mode writes expected **PNG(s)**, **manifest**, **sprite-ref JSON**, and **png-analyze** sidecars when QA is on, under **`os.tmpdir()`** or a disposable fixture dir.
- [ ] **No `FAL_KEY`** required for mock tests; **no network**.
- [ ] **Required:** integration test covers **mock per-tile** end-to-end (same strategy the default dpad mock uses today). **Sheet + crop** path: covered here **or** explicitly delegated to **2gp-mwst** acceptance (preset + pipeline invoke **`generateSheet`** + crops) so the epic has no untested branch.

## Notes

**2026-03-28T16:35:51Z**

Implemented tools/sprite-generation/pipeline.mjs runPipeline(preset, opts): prompt build, mock|fal per-tile or sheet (generateSheet+crops), chroma postprocess for fal, QA via analyze-bridge, then manifest + writeSpriteRef. Stages order per ticket: gen → QA → manifest/sprite-ref. pipeline.test.mjs: mock per-tile e2e + mock sheet+crop; tmpdir; no FAL/network.
