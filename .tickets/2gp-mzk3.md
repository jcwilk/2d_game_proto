---
id: 2gp-mzk3
status: open
deps: []
links: []
created: 2026-03-28T16:21:04Z
type: task
priority: 1
assignee: user.email
parent: 2gp-3y3y
---
# sprite-gen: postprocess (chroma-key + png-region)

Extract from **`tools/dpad-workflow.mjs`** ~**496–628** into pure-buffer modules:

- **`tools/sprite-generation/postprocess/chroma-key.mjs`**: `applyChromaKeyToPngBuffer`, `chromaKeyWithBorderFallback`, `inferBackgroundKeyFromBorder` (preserve **`CHROMA_FALLBACK_TOLERANCE_MIN`** and border-median fallback semantics).
- **`tools/sprite-generation/postprocess/png-region.mjs`**: `countFullyTransparentPercent`, `extractPngRegion`, and related helpers from the same region.

**Testing:** Follow **`tools/png-analyze-metrics.test.mjs`**: build synthetic PNGs with **pngjs** (`PNG.sync.write`), assert deterministic pixels and dimensions.

## Acceptance criteria

- [ ] **Vitest** tests live under **`tools/sprite-generation/postprocess/*.test.mjs`** (included by existing **`tools/**/*.test.mjs`** config).
- [ ] **No live API** and **no calls to generators**; inputs are synthetic buffers only.
- [ ] Tests cover: chroma match path, **border-median / fallback** path, and **invalid crop bounds** (error behavior preserved vs monolith).
- [ ] **Design note** in PR/ticket: functions remain **pure** (buffer in → buffer/stats out).
