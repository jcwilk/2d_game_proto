---
id: 2gp-6srx
status: open
deps: []
links: []
created: 2026-03-29T15:09:24Z
type: feature
priority: 1
assignee: user.email
parent: 2gp-01w4
tags: [sprite-gen, character, layout]
---
# Character walk: 2×2 sheet layout (replace 1×4 strip)

Change the character walk preset from a 1×4 horizontal strip to a 2×2 grid (four TILE_SIZE frames). Updates sheet dimensions, crop rectangles, and any fal sheet extras (e.g. aspect_ratio) so T2I + normalize + crop match the new geometry. Reference `tools/sprite-generation/presets/character.mjs`, `sheet-layout.mjs`, and `tools/sprite-generation/README.md` (character walk section).

## Acceptance Criteria

- [ ] `tools/sprite-generation/presets/character.mjs` defines a 2×2 sheet: width = 2×TILE_SIZE, height = 2×TILE_SIZE (or equivalent explicit dimensions) and `SHEET_CROPS` / frame order documents walk frame index → cell position (row-major or as specified).
- [ ] Sheet T2I inputs (e.g. nano-banana `falExtrasSheet.aspect_ratio`, resolution) match the 2×2 raster; `normalizeDecodedSheetToPreset` still produces correctly aligned crops for all four frames in mock and generate paths.
- [ ] `npm run character-workflow` (or documented equivalent) succeeds in **mock** mode with the new layout; manifest / generation metadata reflects the updated sheet geometry where applicable.
- [ ] `tools/sprite-generation/README.md` character walk section updated: no longer states 1×4 / 4:1 for this preset unless historically noted as superseded.

