---
id: 2gp-fknm
status: closed
deps: [2gp-j2xm]
links: []
created: 2026-03-29T02:44:01Z
type: task
priority: 2
assignee: user.email
parent: 2gp-esal
---
# Sprite-gen: manifest, recipe IDs, and dpad tests

After postprocess is aligned, update manifest.mjs, presets/dpad.mjs header comments, manifest.test.mjs, presets/dpad.test.mjs, sprite-ref.test.mjs so recipe ids and manifest schema match generator+postprocess. Explain recipe bump rationale in closure notes.

## Design

manifest.mjs buildRecipeId and RECIPE_VERSION_* slugs encode generator + postprocess semantics—bump or replace so new behavior is not confused with legacy control-canny recipe strings. Update public-facing manifest fixtures only as needed for the new contract.

## Acceptance Criteria

npm test passes. Recipe id / version slug changes documented in closure note. Tests under `tools/sprite-generation/**/*.test.mjs` covering manifest, sprite-ref, and dpad preset (including `tools/sprite-generation/presets/dpad.test.mjs`) remain consistent with the new semantics.


## Notes

**2026-03-29T02:50:00Z**

Closure: Recipe slug bumps (generator+fal postprocess alignment, distinct from legacy control-canny strings). RECIPE_VERSION_PER_TILE_CONTROL: v6-control-canny → v7-flux-control-lora-triangle (fal-ai/flux-control-lora-canny + mock triangle mask). RECIPE_VERSION_SHEET: v13-frames-chroma → v14-frames-chroma (sheet flux/dev txt2img + crop + chroma; public/art/dpad/manifest.json recipeId updated). RECIPE_VERSION_SHEET_CONTROL: v14-1x4-control-chroma → v15-1x4-flux-control-sheet (opt-in sheet control path; v15 avoids collision with v14 sheet slug). manifest.test.mjs, presets/dpad.test.mjs unchanged: expectations use RECIPE_VERSION_* imports. sprite-ref.test.mjs unchanged (no recipeId assertions).
