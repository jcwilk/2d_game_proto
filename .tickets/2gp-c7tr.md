---
id: 2gp-c7tr
status: closed
deps: [2gp-csxt]
links: []
created: 2026-03-28T17:16:51Z
type: task
priority: 1
assignee: user.email
parent: 2gp-42s3
tags: [sprite-gen, preset, generalization]
---
# sprite-gen: decouple mock + manifest from d-pad-only names (preset-injected shape + layout)

## Design

Shared defaults still assume `dpad.png`, `buildInitialManifest` / `specs.naming` text is d-pad–centric, and `generators/mock.mjs` falls back to `defaultDpadShapeForFrame` for compass ids. **`generate()` already accepts `shapeForFrame`** — the gap is **preset + pipeline + manifest wiring**, not reimplementing mock geometry APIs. Presets should supply `png` basename, optional `specs.naming` labels, `shapeForFrame`, and sheet layout so a non–D-pad asset type does not require editing shared generator code.

## Acceptance Criteria

- No shared default `pngBasename` of `dpad.png` without override path from preset or CLI (document where default lives if kept for back-compat). Audit **`tools/sprite-generation/sprite-ref.mjs`** for `dpad`-style `pngFilename` defaults as well as `pipeline.mjs` / presets.
- `manifest.mjs`: initial `specs.naming` is driven by preset metadata or generic placeholders, not hard-coded d-pad copy only.
- `generators/mock.mjs`: per-frame geometry for mock uses preset-provided `shapeForFrame` when supplied; d-pad preset injects `triangleForDirection` / ids.
- Sheet layout for mock uses preset-injected layout (aligns with sibling ticket **2gp-csxt**).
- **Regression check:** Existing automated tests for mock mode pass (e.g. `tools/sprite-generation/pipeline.test.mjs`, `generators/mock.test.mjs` if applicable). Scope is **contract-level** (dimensions, manifest shape, no throw); bitwise PNG identity is **not** required unless this ticket adds an explicit golden baseline.

