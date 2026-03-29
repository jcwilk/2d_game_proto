---
id: 2gp-fknm
status: open
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

