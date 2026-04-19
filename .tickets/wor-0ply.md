---
id: wor-0ply
status: open
deps: []
links: []
created: 2026-04-19T20:26:25Z
type: task
priority: 1
assignee: Cursor Agent
parent: wor-v0bj
---
# Live-generate isometric-basic-wall spritesheet

Run npm run generate:spritesheet -- run --asset isometric-basic-wall --mode live (requires FAL_KEY in .env). Commit public/art/isometric-basic-wall/ with sheet.png, manifest.json, sprite-ref.json from pipeline. Preset already exists at tools/sprite-generation/presets/isometric-basic-wall/ — halfHeight tier, taller than floor per gameDimensions.

## Acceptance Criteria

- **`public/art/isometric-basic-wall/`** contains committed **`sheet.png`**, **`manifest.json`**, **`sprite-ref.json`** (default CLI output layout).
- **`manifest.json`**: **`kind`** is **`isometric_wall_tile_set`**; **`preset`** is **`isometric_basic_wall`**; **`specs.strategy`** is **`sheet`**.
- **`generationRecipe.mode`** is **`generate`** (this is what **`npm run generate:spritesheet -- … --mode live`** persists — the string **`live`** is CLI-only).

