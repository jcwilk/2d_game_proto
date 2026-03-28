---
id: 2gp-6iay
status: open
deps: [2gp-r67u]
links: []
created: 2026-03-28T21:34:23Z
type: task
priority: 1
assignee: user.email
parent: 2gp-p4js
tags: [dpad, fal, sprite-gen]
---
# Fal D-pad: align control image pixels with model output

After **2gp-r67u** (replace destructive resize) establishes target raster geometry/normalization, ensure **control** image pixel dimensions match **actual** fal model output dimensions at the pipeline checkpoint **after any normalization defined in 2gp-r67u** and **before** per-tile crop/chroma — or document an explicit contract if the service scales control internally. Cover **both** the **sheet** path (`runGenerateSheetPath`) and the **per-tile** path (`runGeneratePerTilePath`), which differ today (sheet path resizes decoded output to the preset; per-tile path does not). The invariant must hold for the **chosen** **2gp-r67u** policy (if output size varies by run, document tolerance).

Prefer an **assert or unit test** on buffer dimensions at a **named** pipeline stage; if not feasible, provide **numbered manual verification steps** with pass/fail (WxH checks) so a verifier is not left with comments-only.

## Design

`tools/sprite-generation/control-image.mjs`, fal subscribe path in `tools/sprite-generation/generators/fal.mjs`, ordering in `tools/sprite-generation/pipeline.mjs` (sheet and per-tile branches).

## Acceptance Criteria

- Documented invariant: control WxH vs raster WxH at the agreed checkpoint (or explicit fal-side contract), consistent with **2gp-r67u** normalization.
- Verifier can run a test **or** follow numbered steps to confirm dimensions without ambiguity.
- References **2gp-r67u**’s chosen geometry; updated if **2gp-r67u** changes sheet constants or normalization order.

