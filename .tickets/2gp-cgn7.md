---
id: 2gp-cgn7
status: closed
deps: [2gp-6iay]
links: []
created: 2026-03-28T21:34:23Z
type: task
priority: 2
assignee: user.email
parent: 2gp-p4js
tags: [dpad, fal, sprite-gen, qa]
---
# Fal D-pad: regression QA for four directional sprites

Prevent regressions so four D-pad directions remain visually distinguishable after pipeline changes. **At close**, declare one path: **automated** (preferred) — **deterministic mock pipeline** or metrics on **geometry / control** stages — **or** **manual** checklist with **measurable** checks (e.g. per-direction bounds, simple image metrics, or hashes) and **which role** may sign off. Full-pipeline **golden PNG hashes** are a poor default when fal/chroma is stochastic (see `tools/sprite-generation/README.md`); if used, scope them to deterministic stages or document flake tolerance.

Follow patterns in `tools/sprite-generation/*.test.mjs` and `tools/sprite-generation/README.md`. Tests run via the repo **`npm test`** script (**Vitest**); there is no separate sprite-gen npm target unless this ticket adds one.

## Design

Add or extend tests under `tools/sprite-generation/` or documented QA steps; avoid references to non-existent paths. Existing `presets/dpad.test.mjs` covers geometry/crops, **not** “four directions distinguishable” — this ticket adds **new** assertions or checklist items for that bar.

## Acceptance Criteria

- Chosen branch (automated vs manual) is stated in ticket close notes or PR.
- Automated: test or script with clear pass/fail in CI or documented **`npm test`** (or added script named in the ticket).
- Manual: numbered steps + measurable criteria + sign-off role; not vague “looks OK.”
- Covers all four directions (up/down/left/right).


## Notes

**2026-03-28T21:41:33Z**

**Closure (2gp-cgn7):** **Automated** regression QA (preferred path).

- **Where:** `tools/sprite-generation/presets/dpad-distinguishability.test.mjs` (Vitest).
- **Pass/fail:** `npm test` (repo root); no separate sprite-gen script added.
- **What:** Deterministic stages only (no fal/chroma golden hashes):
  1. Mock `generate()` at preset `TILE_SIZE` — pairwise **SHA-256** of PNG buffers differ for all six direction pairs (up/down/left/right).
  2. `renderControlMaskBuffer` + `triangleForDirection` at same tile size — pairwise buffer hashes differ (Canny control geometry).
  3. **Measurable metric:** luminance-weighted centroid of opaque pixels — Manhattan separation ≥ 8 px between every pair (guards against accidental identical geometry).
- **CI:** Same as other `tools/sprite-generation/*.test.mjs` tests.

Sign-off: automated; maintainers rely on green `npm test` in CI/local.
