---
id: 2gp-r67u
status: open
deps: [2gp-svav]
links: []
created: 2026-03-28T21:34:20Z
type: feature
priority: 1
assignee: user.email
parent: 2gp-p4js
tags: [dpad, fal, sprite-gen]
---
# Fal D-pad: replace destructive resize with documented policy

Replace the path that **nearest-neighbor squashes** model output to the D-pad strip when decoded PNG size ≠ preset sheet (`resizePngBufferNearest` in `pipeline.mjs` when dimensions mismatch; implementation in `tools/sprite-generation/postprocess/png-region.mjs`). Choose **one** primary strategy in implementation (crop band from square toward 4∶1 before cell work; or request a fal-supported aspect closer to the strip then crop to cells; or change sheet layout / constants so fal output aligns — document rejected alternatives briefly in ticket notes or PR).

**Measurable target:** Final sheet raster matches `SHEET_WIDTH`×`SHEET_HEIGHT` from `tools/sprite-generation/presets/dpad.mjs`, or the ticket/PR explicitly documents **new** sheet constants and updates the preset. Verifier checks **dimensions** of the final decoded sheet buffer (and optional golden asset only if the team adds one under e.g. `fixtures/` — not required to mean committing large binaries every time).

## Design

`tools/sprite-generation/pipeline.mjs`, `tools/sprite-generation/postprocess/png-region.mjs` (and `png-region.test.mjs` if behavior changes), `tools/sprite-generation/presets/dpad.mjs`; `tools/sprite-generation/control-image.mjs` if chroma/crop order changes. Depends on **2gp-svav** findings to pick a justified policy.

## Acceptance Criteria

- One-paragraph policy in code comment or short design note, linked to epic **2gp-p4js**.
- Final D-pad sheet PNG buffer dimensions equal preset `SHEET_WIDTH`×`SHEET_HEIGHT` (or documented new values with preset updated).
- No undocumented sole NN squash from square fal output to final strip unless that paragraph justifies it.
- If multiple strategies were considered, ticket notes or PR lists the chosen approach and why.

