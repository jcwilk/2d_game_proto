---
id: wor-a25k
status: open
deps: [wor-2eoc]
links: []
created: 2026-04-19T20:26:25Z
type: feature
priority: 1
assignee: Cursor Agent
parent: wor-v0bj
---
# Block player movement into wall cells (isometric grid)

Consume the **same occupied-cell set** as **`wor-2eoc`** (import or shared module — single source of truth).

**Grid inverse (full 2D):** with **`ox = pos.x - cellBottomCenter.x`**, **`oy = pos.y - cellBottomCenter.y`**, **`gx - gy = ox / isoHalfW`**, **`gx + gy = oy / isoHalfH + 2 * centerG`**, then **`gx = ((gx+gy)+(gx-gy))/2`**, **`gy = ((gx+gy)-(gx-gy))/2`**. This matches **`gridCellBottomCenter`**; **`isoDepthSumFromWorld`** only recovers **`gx+gy`** from **`y`** — use both axes for **`(gx, gy)`**.

Resolve **integer cell** for collision (e.g. **`Math.round`** on fractional **`gx`**, **`gy`**, or document an equivalent deterministic rule). After computing desired velocity in **`preupdate`**, prevent the feet position from entering a wall cell for the next frame (clamp **`actor.pos`**, adjust **`actor.vel`**, or slide along blocked axis).

Document helpers beside **`gridCellBottomCenter`** or in **`src/isometricGrid.ts`** if extracted.

## Acceptance Criteria

Player cannot enter wall **`(gx, gy)`** cells; non-wall movement unchanged; sliding along a wall does not oscillate or jitter at edges; uses the same wall set as sprite placement.

