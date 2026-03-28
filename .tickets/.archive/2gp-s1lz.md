---
id: 2gp-s1lz
status: closed
deps: []
links: []
created: 2026-03-28T16:21:08Z
type: task
priority: 2
assignee: user.email
parent: 2gp-3y3y
---
# sprite-gen: sprite-ref exporter

Add **`tools/sprite-generation/sprite-ref.mjs`**: **`writeSpriteRef(preset, outBase)`** (or equivalent) writes **atlas-oriented JSON** for **`src/art/`** loaders. Types and validation targets live in **`src/art/atlasTypes.ts`**.

- **Individual tiles** (dpad default per plan): likely **`FrameKeyRectManifestJson`** — use **`parseFrameKeyRectManifestJson`** in tests, or **`parseGridFrameKeysManifestJson`** / **`parseAtlasGridManifestJson`** if the preset uses a **grid** sheet — **pick one flavor per preset** and test that parser.
- Document in the module which **`atlasTypes`** interfaces the file satisfies.

## Acceptance criteria

- [x] Generated JSON is validated with the appropriate **`parse*`** helper from **`src/art/atlasTypes.ts`** (same contracts as runtime). Tests should live under **`tools/**/*.test.mjs`** per plan; if Vitest cannot import **`src/**/*.ts`** from those tests, document the workaround in the close note (e.g. minimal **`src/**/*.test.ts`** shim) — **no ad-hoc duplicate schemas**.
- [x] Paths in JSON are consistent with **`public/`** URL layout (as today) and **`spriteRef`** block in the plan’s preset contract.
- [x] Close note names the **manifest flavor** chosen for dpad (**`FrameKeyRectManifestJson`** vs grid) and why.

## Notes

**2026-03-28T16:32:17Z**

Implemented tools/sprite-generation/sprite-ref.mjs: writeSpriteRef + buildSpriteRefPayload. D-pad default uses FrameKeyRectManifestJson (parseFrameKeyRectManifestJson): per-tile PNGs under art/dpad/<dir>/dpad.png with full-tile rects (0,0,tileSize,tileSize); chosen over grid because the default dpad pipeline is per-tile (matches dpad-workflow per-tile strategy). Grid sheet variant covered by second preset shape + parseGridFrameKeysManifestJson. Vitest imports ../../src/art/atlasTypes.ts from tools/sprite-ref.test.mjs without shim. Tests: tools/sprite-generation/sprite-ref.test.mjs.
