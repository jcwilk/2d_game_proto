---
id: 2gp-zzl6
status: closed
deps: [2gp-j6so]
links: []
created: 2026-03-29T03:23:23Z
type: task
priority: 1
assignee: user.email
parent: 2gp-vplr
---
# Phase C: BRIA matting sheet → RGBA tiles

Run fal-ai/bria/background/remove once per sheet (same cost pattern as FalSprite), then crop RGBA tiles.

Wiring (plan Phase C): fal.subscribe nano-banana-2 → data.images[0].url → BRIA with image_url (HTTPS); download BRIA result → normalizeDecodedSheetToPreset → extractPngRegion per frame. Sheet-level step inside runGenerateSheetPath after T2I URL, before per-tile extract/chroma; avoid awkward POSTPROCESS_REGISTRY sheet-op unless later unified.

Post-tile: if BRIA used for sheet, default postprocess [] or skip chromaKey for RGBA tiles; optional chromaKey when BRIA disabled for A/B.

Manifest: extend generationResults; alphaSource on generationResults._sheet ('bria' | 'chroma' | 'none'); optional per-frame duplicate; chromaKeySource for chroma path only. Bump RECIPE_VERSION_SHEET in manifest.mjs when sheet pipeline semantics change.

Authority: tools/sprite-generation/FALSPRITE_INTEGRATION_PLAN.md § Phase C, § Separation of concerns alpha policy.

## Design

- Pick one client API (subscribe vs run) per @fal-ai/client + docs; document timeout/retry in code comments (plan Open questions #3).
- When BRIA is implemented, update tools/sprite-generation/README.md so “future BRIA” / alpha sections match behavior (coordinate with Phase D runbook edits to avoid contradictory operator docs).

## Acceptance Criteria

- Dpad sheet run with BRIA enabled yields RGBA tiles; manifest shows alphaSource: 'bria' on _sheet (plan Phase C acceptance).
- RECIPE_VERSION_SHEET bumped when semantics change — verify in manifest.mjs diff or manifest output field.
- Verifier: integration test with mock URL chain or documented manual run with FAL_KEY + artifact paths in close note.

