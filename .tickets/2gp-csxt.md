---
id: 2gp-csxt
status: closed
deps: []
links: []
created: 2026-03-28T17:16:51Z
type: task
priority: 1
assignee: user.email
parent: 2gp-42s3
tags: [sprite-gen, mock, ssot]
---
# sprite-gen: unify mock sheet layout with preset crops (single SSoT)

## Design

Today `generators/mock.mjs` exports `DEFAULT_DPAD_SHEET_LAYOUT` (2×2 **cell** indices) while `presets/dpad.mjs` defines `SHEET_SIZE` and `SHEET_CROPS` (**pixel** top-left origins per frame). Crop extraction in the pipeline already uses `preset.sheet.crops`; **mock sheet composition** still defaults `sheetLayout` internally, so layout and crops can drift. Pipeline must pass a **single derived** layout into `mockGenerateSheet` (cell grid consistent with `SHEET_CROPS` / tile size) so composition and cropping stay aligned.

## Acceptance Criteria

- **SSoT:** The cell grid used to place tiles in the mock sheet is derived from the preset’s sheet definition (`preset.sheet.size`, `preset.sheet.crops`, `preset.tileSize`)—not an independent constant in `generators/mock.mjs`—or is explicitly passed in from `tools/sprite-generation/pipeline.mjs` with a one-line comment mapping **pixel crop origins → cell coordinates** (document the normalization rule).
- `DEFAULT_DPAD_SHEET_LAYOUT` is removed or is a thin alias re-exported from the preset module with a comment that it is not independent.
- **Mock sheet path:** `tools/sprite-generation/pipeline.mjs` passes preset-derived layout into `mockGenerateSheet` so **composition** matches the same frame→placement mapping implied by `preset.sheet.crops` (this is distinct from per-frame **crop extraction**, which already uses those crops).
- **Tests:** Update `tools/sprite-generation/generators/mock.test.mjs` (and any test importing `DEFAULT_DPAD_SHEET_LAYOUT`) so expectations match the new SSoT.
- `./tk dep cycle` reports no cycles after related dep updates.

