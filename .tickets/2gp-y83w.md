---
id: 2gp-y83w
status: closed
deps: []
links: []
created: 2026-03-28T16:21:08Z
type: task
priority: 2
assignee: user.email
parent: 2gp-3y3y
---
# sprite-gen: manifest builder

Add **`tools/sprite-generation/manifest.mjs`**: assemble and write **`manifest.json`** compatible with the existing **`public/art/dpad/manifest.json`** shape: **`kind`**, **`preset`**, **`recipeId`**, **`createdAt`**, **`workflow`**, **`specs`**, **`generationRecipe`**, **`frames[]`**, provenance fields. Extract from **`dpad-workflow.mjs`** manifest/orchestration logic (search for manifest writer / `main()`; line numbers **~852–908** are approximate).

**`recipeId` versioning:** The manifest must include a stable **`recipeId`** string that **changes when** generation semantics change (pipeline major behavior, preset recipe, or strategy). Document the naming scheme in the module (e.g. prefix **`sprite-gen-`** + preset id + strategy + version slug). Bump when postprocess or generator contract changes.

## Acceptance criteria

- [ ] Unit tests build a manifest object from **fixture inputs** (mock mode, per-tile vs sheet as applicable); assert required top-level keys and **`frames`** length/order match the preset.
- [ ] **`recipeId`** and **`generationRecipe`** fields are present and validated by test for at least **mock** and one **strategy** path if both exist in code.
- [ ] Output matches structural expectations of the checked-in **`public/art/dpad/manifest.json`** sample (field names/types); note intentional deltas in the close note.

## Notes

**2026-03-28T16:32:25Z**

Implemented tools/sprite-generation/manifest.mjs: buildRecipeId (sprite-gen-{preset}-{segment}-{version slug}), buildInitialManifest matching dpad manifest shape. Refactored dpad-workflow.mjs to use module. Unit tests: mock + per-tile + sheet + structural key parity vs public/art/dpad/manifest.json.

Intentional delta vs old checked-in recipeId strings: recipeId now uses sprite-gen-dpad_four_way-* prefix and RECIPE_VERSION_* slugs (replaces dpad-workflow-mock-v2 / fal-per-tile-v4 / fal-sheet-v13). Workflow strings and all other field names unchanged for generate paths.
