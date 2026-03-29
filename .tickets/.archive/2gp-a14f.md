---
id: 2gp-a14f
status: closed
deps: [2gp-j6so, 2gp-zzl6]
links: []
created: 2026-03-29T03:23:23Z
type: task
priority: 1
assignee: user.email
parent: 2gp-vplr
---
# Phase D: Preset, CLI, falExtras merge (dpad M1)

presets/dpad.mjs (or adjacent dpad-falsprite-preset.mjs): fal.defaultEndpoint fal-ai/nano-banana-2 for sheet strategy; fal.falExtrasSheet aligned with nano-banana (aspect_ratio, resolution, …); remove Flux-only keys when endpoint is nano-banana to avoid silent ignores.

Fix falExtras when --endpoint overrides default: today pipeline.mjs only merges falExtrasSheet/falExtrasPerTile when endpoint matches preset default (plan cites lines). Implement A or B for M1 — plan recommends B: merge sheet/per-tile extras when opts.endpoint shares same family as preset.fal.defaultEndpoint (e.g. sameEndpointFamily); use A (extrasByEndpoint) only if one preset must ship different extra blobs for two full endpoint strings.

Document new flags beside tools/sprite-generation/README.md runbook; keep FALSPRITE_INTEGRATION_PLAN runbook pointing at README as live source.

Authority: tools/sprite-generation/FALSPRITE_INTEGRATION_PLAN.md § Phase D, § Milestone 1, § Runbook.

## Design

- M1 default recommendation Option B unless preset needs multiple distinct endpoint blobs (then Option A).

## Acceptance Criteria

- Runbook command succeeds (e.g. FAL_KEY=… npm run dpad-workflow -- --mode generate --strategy sheet --keep-sheet per plan Runbook); manifest lists endpoint and alphaSource on _sheet (plan Phase D acceptance).
- With --endpoint override matching nano-banana family, preset-tuned aspect_ratio/resolution still merge — evidenced by test or logged merged input (plan Phase D Option B).
- Verifier: command exit 0 + jq or test on manifest JSON fields; npm run mock:dpad-workflow still passes for no-network CI.

