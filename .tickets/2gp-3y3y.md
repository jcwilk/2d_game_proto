---
id: 2gp-3y3y
status: open
deps: []
links: []
created: 2026-03-28T16:21:01Z
type: epic
priority: 2
assignee: user.email
---
# Epic: Sprite generation pipeline library

Decompose `tools/dpad-workflow.mjs` into a modular **`tools/sprite-generation/`** library: independent stages, Vitest coverage (`tools/**/*.test.mjs`, **no live API / no image generation in tests**), **`presets/dpad.mjs`** as the first preset, **`tools/dpad-workflow.mjs`** as a thin CLI, and verification that **`npm run mock:dpad-workflow`** (and **`tools/mock-dpad-workflow.mjs`**) stay behaviorally aligned with the pre-refactor mock pipeline.

**Authoritative plan:** `/home/user/.cursor/plans/sprite_generation_library_9987ed24.plan.md` (Sprite Generation Pipeline Library). Other machines may not have this path — **recommend** a repo-local copy under e.g. **`docs/plans/`** and link it from the epic close note when present.

## Child tickets (execution order follows `./tk dep` / `ready`)

| ID | Title |
|----|--------|
| 2gp-g5bi | sprite-gen: logging module |
| 2gp-mzk3 | sprite-gen: postprocess (chroma-key + png-region) |
| 2gp-5ixa | sprite-gen: generators (mock + fal) |
| 2gp-h68c | sprite-gen: prompt builder |
| 2gp-y83w | sprite-gen: manifest builder |
| 2gp-s1lz | sprite-gen: sprite-ref exporter |
| 2gp-3xsk | sprite-gen: QA analyze bridge |
| 2gp-98mn | sprite-gen: pipeline orchestrator (depends on all modules above) |
| 2gp-mwst | sprite-gen: dpad preset |
| 2gp-b4lm | sprite-gen: rewire dpad-workflow CLI |
| 2gp-f7b6 | sprite-gen: verify mock parity |
| 2gp-muyg | sprite-gen: document tools/README and npm scripts |

## Epic completion (verifier)

- All child tickets **closed** with notes pointing at merged paths under `tools/sprite-generation/`.
- **`./tk dep cycle`** reports no cycles; final **`mock:dpad-workflow`** / **`mock-dpad-workflow.mjs`** parity documented under **2gp-f7b6**.
- Runtime atlas compatibility for generated JSON remains checkable against **`src/art/atlasTypes.ts`** (see **2gp-s1lz**, **2gp-y83w**).
