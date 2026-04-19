---
id: wor-v0bj
status: open
deps: []
links: []
created: 2026-04-19T20:26:14Z
type: epic
priority: 2
assignee: Cursor Agent
---
# Epic: Isometric wall tiles, live art, and grid collision

Use the existing **halfHeight** preset **`isometric-basic-wall`**: same **W** footprint as floor (`TILE_FOOTPRINT_WIDTH_PX`); cell height **`isoSquareCellSizePx('halfHeight')`** in **`src/dimensions.ts`** / **`gameDimensions.ts`** — **taller** than the **W×(W/2)** floor-only texture strip.

Live-generate the spritesheet (**`wor-0ply`**), load walls and place actors (**`wor-2eoc`**), then block movement into occupied cells using the same **`(gx, gy)`** grid as floor placement — recover **`(gx, gy)`** from world position via the **full 2D linear inverse** of **`gridCellBottomCenter`** (both **`x`** and **`y`** contribute; not the **`y`**-only depth helper alone).

