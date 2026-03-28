---
id: 2gp-p4js
status: closed
deps: []
links: []
created: 2026-03-28T21:34:15Z
type: epic
priority: 1
assignee: user.email
tags: [dpad, fal, sprite-gen]
---
# Epic: D-pad fal sheet — output size, resize policy, control alignment

The D-pad sprite pipeline requests **400×100** from `fal-ai/flux-control-lora-canny` but observed **512×512** responses, then **nearest-neighbor** resizes to 400×100, harming arrow direction and shape.

**Context:** Web research indicates `image_size` should be set as an object `{width,height}` (or a string preset); `parseImageSize` in `tools/sprite-generation/generators/fal.mjs` maps `WxH` strings to `{width,height}` and passes non-matching strings (e.g. preset names) through unchanged. **Out of scope:** `useControlCannySheet` ReferenceError (already fixed in repo).

**Code references:** `tools/sprite-generation/generators/fal.mjs`, `tools/sprite-generation/pipeline.mjs`, `tools/sprite-generation/postprocess/png-region.mjs`, `tools/sprite-generation/presets/dpad.mjs`, `tools/sprite-generation/control-image.mjs`.

**Note:** Dimension mismatch handling (WARN + `resizePngBufferNearest`) runs in **`pipeline.mjs`** after download, not inside the fal generator alone.

**Done when:** All child tickets under this epic are closed and `./tk dep cycle` is clean.


## Notes

**2026-03-28T21:42:12Z**

**Epic closure:** All child tickets with `parent: 2gp-p4js` are closed (2gp-svav, 2gp-r67u, 2gp-6iay, 2gp-cgn7). `./tk dep cycle` clean.
