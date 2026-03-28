---
id: 2gp-s1lz
status: open
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

- [ ] Generated JSON is validated with the appropriate **`parse*`** helper from **`src/art/atlasTypes.ts`** (same contracts as runtime). Tests should live under **`tools/**/*.test.mjs`** per plan; if Vitest cannot import **`src/**/*.ts`** from those tests, document the workaround in the close note (e.g. minimal **`src/**/*.test.ts`** shim) — **no ad-hoc duplicate schemas**.
- [ ] Paths in JSON are consistent with **`public/`** URL layout (as today) and **`spriteRef`** block in the plan’s preset contract.
- [ ] Close note names the **manifest flavor** chosen for dpad (**`FrameKeyRectManifestJson`** vs grid) and why.
