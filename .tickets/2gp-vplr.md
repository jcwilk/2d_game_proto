---
id: 2gp-vplr
status: open
deps: []
links: []
created: 2026-03-29T03:23:16Z
type: epic
priority: 2
assignee: user.email
---
# Epic: FalSprite-style sprite pipeline (M1 dpad 1×4)

Adopt the FalSprite-aligned stack (optional LLM rewrite via fal openrouter/router, nano-banana-2 T2I, BRIA background removal) while keeping geometry, crops, manifest, and QA in the existing runPipeline flow. Milestone 1: preset-driven 1×4 dpad HUD strip (four buttons), not FalSprite’s full N×N grid.

Canonical plan: tools/sprite-generation/FALSPRITE_INTEGRATION_PLAN.md (phases A–D, M1 table, runbook, risks). Branch/deploy per AGENTS.md: no merge to main unless explicitly requested.

## Design

- Stack order when fully enabled: optional rewrite → nano-banana-2 sheet → BRIA once per sheet → normalize → crops; see plan “Target stack” and “Separation of concerns.”
- Alpha policy: prefer BRIA → RGBA tiles for M1 when FAL_KEY allows; chromaKey as fallback; document per-sheet BRIA cost at implementation time.
- Non-goals (stretch): full N×N animation grid, nano-banana-pro/edit reference workflow, FalSprite UI.

## Acceptance Criteria

- M1.1: One sheet (e.g. 400×100 or configured) via fal-ai/nano-banana-2 with aspect_ratio "4:1" (or equivalent yielding four equal columns after normalize) — verify via manifest/generation output per plan Milestone 1.
- M1.2: Style/composition from prompt.mjs builders and/or checked-in preset prompt module (hardcoded acceptable) — traceable in preset or prompt source.
- M1.3: Four crops match SHEET_CROPS in presets/dpad.mjs; assertPngBufferDimensions passes after normalize.
- M1.4: Alpha via BRIA path or documented chroma fallback with tunable tolerance; no silent corner-median unless logged.
- M1.5: Manifest records endpoint, timings, alpha source; no merge to main required for completion (per plan M1 table).
- Evidence: tools/sprite-generation/README.md runbook commands succeed where network keys apply; npm run mock:dpad-workflow passes for CI path; cite plan sections “Milestone 1” and “Runbook.”
- Epic completion (rollup): all child tickets for phases A–D are closed and M1.1–M1.5 are verifiable together on the branch; end-to-end proof may overlap Phase D acceptance (runbook + manifest) — epic AC is integration DoD, not duplicate ownership of every implementation detail.

