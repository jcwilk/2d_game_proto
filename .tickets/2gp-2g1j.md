---
id: 2gp-2g1j
status: open
deps: []
links: []
created: 2026-03-29T15:09:24Z
type: feature
priority: 1
assignee: user.email
parent: 2gp-01w4
tags: [sprite-gen, character, bria, alpha]
---
# Character walk: BRIA-only alpha — disable chromaAfterBria

Turn off optional per-tile chroma / fringe cleanup after BRIA matting for the character walk preset, matching falsprite’s BRIA-only alpha path. Today `preset.fal.chromaAfterBria` defaults on for character (see `tools/sprite-generation/pipeline-stages.mjs` `resolveSheetTilePostprocessSteps`, `README.md`). Default should be off so tiles are not run through `chromaKey` after BRIA unless explicitly opted in.

## Acceptance Criteria

- [ ] `tools/sprite-generation/presets/character.mjs` sets `fal.chromaAfterBria` to **false** (or equivalent) so the character preset default matches BRIA-only; `resolveSheetTilePostprocessSteps` yields **no** per-tile postprocess steps for the sheet+BRIA path when using that preset default.
- [ ] Verification (pick one): extend `tools/sprite-generation/pipeline.test.mjs` (or equivalent) **or** document a manual generate run with `FAL_KEY` + `npm run character-workflow -- --mode generate` that asserts manifest **`generationResults._sheet.alphaSource === 'bria'`** and each frame’s **`chromaApplied === false`** and **`chromaKeySource`** absent or null (no post-crop chroma on tiles).
- [ ] `tools/sprite-generation/README.md` updated: character walk line no longer claims post-BRIA chroma is on by default.

