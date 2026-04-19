---
id: wor-8vq0
status: open
deps: [wor-98q7]
links: []
created: 2026-04-19T20:34:59Z
type: task
priority: 2
assignee: Cursor Agent
parent: wor-d64p
---
# Sprite preset: 4-frame drag orb / stuck HUD sheet

Add a new **`tools/sprite-generation`** preset module (**`presets/<assetId>/`** pattern per **`preset-contract.ts`**) that builds a **4-cell** sprite sheet with a **documented layout** (recommended: **1×4 horizontal strip** in row-major order for frames 0–3; if 2×2 instead, document cell order explicitly). Frame **0** = neutral HUD icon; frames **1–3** = activation sequence on successful drop. Wire into generation **`README`** / pipeline like other presets.

**Output location:** committed / generated assets under **`public/art/<slug>/`** (site URL prefix **`${BASE_URL}art/<slug>/...`**) per **`tools/sprite-generation/README.md`** — do not only say “`art/`” without the `public/` mapping.

## Design

- Follow **`preset-contract.ts`**: named exports including **`ASSET_ID`**, **`MANIFEST_PRESET_ID`**, **`KIND`**, **`createPreset`**, **`recipeId`**.
- For **wiring** (manifest, sprite-ref JSON, fal pipeline), mirror **HUD-style** presets (e.g. **dpad**) more than **character walk 2×2** sheets—avoid copying walk **grid geometry** by mistake.
- **`MANIFEST_PRESET_ID` / `ASSET_ID`** should be **technical and stable** (e.g. `hud_drag_orb`); ticket title wording is informal.

## Acceptance Criteria

- Module exports **`SpritePresetModule`** with all **required** contract fields (**`ASSET_ID`** included).
- Recipe runs in **mock** or documented **generate** path; art outputs checked in **or** generation steps documented.
- **Four** frames addressable from runtime by **stable ids** in **`sprite-ref.json`** (documented in module comments).
- Dimensions + frame order match what **wor-98q7** / **wor-0814** assume for animation.
