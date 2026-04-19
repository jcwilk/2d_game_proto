---
id: wor-2eoc
status: open
deps: [wor-0ply]
links: []
created: 2026-04-19T20:26:25Z
type: feature
priority: 1
assignee: Cursor Agent
parent: wor-v0bj
---
# Load wall sheet in main scene and place wall actors

Wire **`createGridSheetLoader('art/isometric-basic-wall')`** into **`mergeGridSheetLoaders`** in **`src/main.ts`**. Build sprites from **`sprite-ref`** (**`wall_0`…`wall_3`**). Scale with **`scaleToTargetWidthPx(graphic.width, TILE_FOOTPRINT_WIDTH_PX)`** same as floor.

Define a **single exported structure** (e.g. **`Set<string>`** of **`\"gx,gy\"`** or an array of **`[gx, gy]`**) for which cells are walls — **reuse in `wor-a25k`** for collision (do not duplicate layout).

Place walls on a subset of cells (e.g. line or L-shape): **`pos = gridCellBottomCenter(gx, gy)`**, **`graphics.anchor = vec(0.5, 1)`**. Pick variants with **`Math.floor(Math.random() * 4)`** or a fixed mapping (document in code).

**Z-order:** Floor tiles use **`z = gx + gy`**. The wall at **`(gx, gy)`** must satisfy **`z > gx + gy`** (e.g. **`z = gx + gy + 0.5`**) so it draws **above** the same-cell floor. Characters use **`isoCharacterZFromWorldPos`** (~**`floorZMax + 1`** band) — keep walls **below** that band for this iteration so layering stays predictable unless you intentionally add depth-based wall vs character ordering.

## Acceptance Criteria

Game loads with committed wall assets; visible wall sprites on chosen cells; bottom anchors align with floor grid; **`z`** strictly above same-cell floor; wall cell list is shared for collision (**`wor-a25k`**).

