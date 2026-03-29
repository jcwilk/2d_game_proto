---
id: 2gp-ibfz
status: closed
deps: [2gp-vk43]
links: []
created: 2026-03-29T02:43:58Z
type: feature
priority: 1
assignee: user.email
parent: 2gp-esal
---
# Sprite-gen: fal generator and pipeline integration

Implement the fal integration chosen in the strategy ticket: purpose-built subscribe inputs (no default dpad reliance on flux-control-lora-canny). Wire runPipeline / resolveGeneratorConfig / createPreset defaults so mock and generate modes match the new contract. Keep mocked fal tests (no network in CI).

## Design

Update generators/fal.mjs, pipeline.mjs, and preset wiring. Touch **pipeline-stages.mjs** only as needed for generator merge / `resolveGeneratorConfig` wiring—**2gp-j2xm** owns default postprocess registry and alpha alignment on the same file after this ticket lands. Replace redactFalInputForLog or extend it for new fal payload keys with one documented logging policy. Do not wholesale-delete legacy control-canny-only tests/files in this ticket if that would leave the tree inconsistent—defer to **2gp-sxtu** after new paths work.

## Acceptance Criteria

npm test passes at repo root. npx vitest run tools/sprite-generation/generators/fal.test.mjs passes. New or updated tests assert subscribe input shape for the chosen endpoint(s) using mocked fal (no live FAL_KEY required for CI). Dpad (or documented default generate path) does **not** use `flux-control-lora-canny` as the default endpoint. Implementation matches endpoints and topology described in `tools/sprite-generation/README.md` from **2gp-vk43**. pipeline.mjs and pipeline-stages.mjs changes covered by existing or added tests as appropriate. Closure note lists endpoints, key pipeline touchpoints, and **one short bullet** on the logging/redaction policy for new fal payload keys.

## Closure

- **Endpoints:** Default dpad **sheet** generate uses **`fal-ai/flux/dev`** (`falSubscribeToBuffer`). **Per-tile** with control uses **`fal-ai/flux-control-lora-canny`** (`falSubscribeControlCannyToBuffer`); **`--no-control`** / `useControlCanny: false` uses **`fal-ai/flux/dev`**. Sheet control-Canny is **opt-in** via `runPipeline(..., { useSheetControlCanny: true })` only (not the default CLI path).
- **Pipeline touchpoints:** `pipeline.mjs` — `useControlCanny` (per-tile), `useSheetControlCanny` (sheet opt-in), endpoint resolution and `falExtrasSheet` / `falExtrasControl` selection; `manifest.mjs` — `buildRecipeId` sheet branch uses `controlCanny === true` for the v14 control recipe slug; `generators/fal.mjs` — subscribe helpers + `redactFalInputForLog`; `presets/dpad.mjs` / `tools/dpad-workflow.mjs` — defaults and help text; checked-in `public/art/dpad/manifest.json` aligned to flux/dev sheet. `pipeline-stages.mjs` unchanged (no postprocess registry work in this ticket).
- **Logging / redaction:** Any input key whose name ends with **`_url`** is redacted like **`control_lora_image_url`** (data URI length + prefix, or https host + truncated path); **`prompt`** remains hashed; secret-like key names are stripped.

