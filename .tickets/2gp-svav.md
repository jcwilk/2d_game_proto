---
id: 2gp-svav
status: open
deps: []
links: []
created: 2026-03-28T21:34:20Z
type: task
priority: 1
assignee: user.email
parent: 2gp-p4js
tags: [dpad, fal, sprite-gen]
---
# Fal D-pad: instrument request/response and document size behavior

Extend existing fal logging (control-canny already logs `image_size` at INFO on subscribe). Add: **full serialized request `input`** for the flux-control-lora-canny call with **redaction/truncation**: omit or hash/truncate `control_lora_image_url` when it is a large data URI; redact obvious secrets; keep structural fields (`image_size`, `prompt` length or hash if needed for privacy). Log **decoded PNG width and height** as soon as the PNG buffer is available (PNG header parse or `PNG.sync.read` on the returned buffer—document the chosen hook in `fal.mjs` subscribe completion and/or the first consumer). Build a **comparison table** for **400×100** (object from `parseImageSize`) vs at least two **string** presets — use names **documented/valid for fal** for this model (validate in the run; e.g. include `landscape_16_9` from existing tests; do not assume a token like `square` without confirmation). Empirical rows typically require **live fal calls** (API key, cost); summarize in the artifact with log excerpts.

**Write-up must answer:** (a) Does this endpoint honor non-square `image_size` for this model? (b) Under what conditions does decoded output become 512² vs requested dimensions? (c) Note merged extras (`falExtras`) shape if they affect `input`.

**Artifact location:** Prefer a short file under `tools/sprite-generation/` (e.g. `docs/` or a dated note) **or** structured ticket notes with a discoverable path — not only ephemeral console-only logs.

## Design

Touch only logging/instrumentation: `tools/sprite-generation/generators/fal.mjs`, and call sites in `tools/sprite-generation/pipeline.mjs` / `tools/sprite-generation/presets/dpad.mjs` as needed. No change to resize, crop, or `resizePngBufferNearest` behavior in this ticket.

## Acceptance Criteria

- Written artifact (repo file or ticket) contains: comparison table + explicit answers to (a)–(b) (and (c) if applicable).
- Logs or doc show post-decode PNG dimensions alongside request `image_size`.
- Serialized `input` logging policy is defined (truncation/redaction for data URIs and bulky fields).
- No behavior change to nearest-neighbor resize or sheet dimensions.

