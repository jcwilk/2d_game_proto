# FalSprite-style integration plan (sprite-generation pipeline)

This document is an implementation-ready plan to adopt the **same technology stack** as [FalSprite](https://github.com/lovisdotio/falsprite)—**optional LLM prompt rewrite via fal** (`openrouter/router`), **nano-banana-2** text-to-image, **BRIA background removal**—while keeping **geometry, crops, manifest, and QA** in this repo’s existing `runPipeline` flow. Milestone 1 is a **preset-driven 1×4 dpad HUD strip** (four buttons), not FalSprite’s full N×N grid UI.

**Branch / deploy:** Per `AGENTS.md`, do not merge this work to `main` in deployment notes unless the project explicitly requests it.

---

## Current baseline (this repo)

| Area | Location | Behavior today |
|------|----------|------------------|
| Default T2I | `pipeline.ts` `DEFAULT_FAL_ENDPOINT` | `fal-ai/flux/dev` |
| Single subscribe + download | `generators/fal.ts` `falSubscribeToBuffer` | Builds **Flux-shaped** input: `prompt`, `image_size` (string or WxH), `num_images`, `output_format`; expects `data.images[0].url` |
| Sheet path | `pipeline.ts` `runGenerateSheetPath` | One `falSubscribeToBuffer` per run, `buildSheetPrompt` from `prompt.ts`, then `normalizeDecodedSheetToPreset` → crops → `applyPostprocessPipeline` |
| Dpad preset | `presets/dpad/dpad.ts` | `SHEET_WIDTH`/`HEIGHT` = 400×100 (1×4 × `TILE_SIZE` 100); `fal.falExtrasSheet` = Flux-only knobs (`num_inference_steps`, `guidance_scale`, …) |
| Alpha | `pipeline-stages.ts` | Only `chromaKey` in `POSTPROCESS_REGISTRY`; README already mentions future BRIA-class steps |

**Pain driving this plan:** `flux/dev` + chroma produced weak visuals and fragile chroma (border fallback, magenta fringing called out in `prompt.ts`).

---

## Target stack (FalSprite-aligned)

Public FalSprite sources in the **upstream** FalSprite repository (see that project’s `lib/` and `api/` entrypoints) chain roughly:

1. **Rewrite (optional):** `openrouter/router` on fal with a **model** string (e.g. `openai/gpt-4o-mini`), `prompt`, `system_prompt`, `max_tokens`, `temperature`—**one `FAL_KEY`**, no separate OpenRouter key in app code.
2. **Image:** `fal-ai/nano-banana-2` with **`prompt`**, **`aspect_ratio`**, **`resolution`**, `num_images`, `output_format`, etc.—not Flux’s `image_size` tuple.
3. **Matting:** `fal-ai/bria/background/remove` with **`image_url`** (HTTPS URL from step 2’s result). Implemented in FalSprite as a **direct** `fal.run`-style call vs queued long jobs.

**Minimal port for a 1×4 strip:** Same order **if** you want parity; for milestone 1 you can **hardcode** the final image prompt in a preset file and **skip** rewrite to reduce moving parts. Use **one horizontal sheet** job with **`aspect_ratio: "4:1"`** (wide row of four panels)—**not** `"1:4"` (that is tall/narrow).

---

## Separation of concerns

| Responsibility | Adopt from FalSprite | Keep local |
|----------------|----------------------|------------|
| Prompt templates for dpad / sheet | Ideas only (wording, grid language); **no** need to copy `buildSpritePrompt` N×N | `prompt.ts` + preset `prompt` fields; optional new **`preset prompt file`** that exports strings or a small JSON blob read by CLI |
| LLM rewrite | Call pattern: `fal.subscribe("openrouter/router", { input })` | System/user prompts tuned for **HUD glyph** consistency; store defaults beside preset |
| T2I | `fal-ai/nano-banana-2` + correct `aspect_ratio` / `resolution` | `runGenerateSheetPath` still owns one sheet → normalize → `extractPngRegion` crops |
| Transparency | BRIA output URL → download → PNG with alpha | Optional **second** path: chroma-only when BRIA disabled or for A/B |
| Observability | N/A | Keep `redactFalInputForLog`, PNG dimension logs, manifest `endpoint` / timings |

**Alpha policy (recommended):** Prefer **BRIA → RGBA tiles** for milestone 1 when `FAL_KEY` allows it; keep **`chromaKey`** as **fallback** (preset `postprocessSteps: ['briaAlpha']` or `['chromaKey']` or documented order once `briaAlpha` exists). Document that BRIA is **per-sheet cost** (~$0.018/image per fal’s BRIA model page—re-verify at implementation time).

---

## Implementation phases

### Phase A — Endpoint abstraction in `generators/fal.ts`

**Goal:** Stop assuming every model speaks Flux `image_size` + same response shape.

- Introduce a small **internal** map or strategy object: **endpoint family** → `{ buildInput(ctx), parseResult(data), subscribeOptions }`.
- Refactor `falSubscribeToBuffer` into:
  - **`falSubscribeImageToBuffer({ endpoint, input, ... })`** — generic subscribe + download + PNG decode logging; **or**
  - Keep one function but accept **pre-built `input`** and optional **response adapter** if `data.images` shape differs by model.
- **nano-banana-2** builder: `prompt`, `aspect_ratio: "4:1"`, `resolution` (e.g. `1K`—validate against fal OpenAPI for allowed values), `num_images: 1`, `output_format: "png"`, optional `seed`.
- **Flux** builder: preserve current behavior for backward compatibility and A/B.

**Acceptance (Phase A):** Unit or integration test with **mock** `falSubscribe` that asserts the **input object** for `fal-ai/nano-banana-2` contains `aspect_ratio` / `resolution`, not only `image_size`.

### Phase B — Optional LLM rewrite module

**Goal:** Optional step before sheet generation, driven by preset or CLI flag.

- New helper e.g. `rewritePromptViaOpenRouter({ userPrompt, systemPrompt, model, temperature, maxTokens })` calling `fal.subscribe("openrouter/router", { input: { ... } })`.
- Wire **only** into **sheet** path first: `buildSheetPrompt` output → rewrite → **nano-banana** input prompt.
- **Default off** for dpad milestone if using a **frozen preset prompt file**; enable for iteration.

**Acceptance (Phase B):** Dry-run or logged path shows rewrite **skipped** when disabled; when enabled, add optional fields under **`generationResults._sheet`** (e.g. `rewriteModel`, `rewrittenPromptSha256`) — never log full prompt text at INFO; use `hashPromptForLog` from `generators/fal.ts`.

### Phase C — BRIA matting for sheet → tiles

**Goal:** Run **`fal-ai/bria/background/remove`** **once per sheet** (same cost pattern as FalSprite), then crop **RGBA** tiles.

**Chosen wiring (resolves URL-vs-buffer ambiguity):**

1. **`fal.subscribe` to `fal-ai/nano-banana-2`** → read `data.images[0].url` (same response shape as Flux in current `falSubscribeToBuffer`; if fal ever diverges, handle in the endpoint adapter from Phase A).
2. **Call BRIA with that HTTPS `image_url`** — no client-side upload of the raw PNG for M1 (matches FalSprite’s `runDirectModel` pattern: remote URL in, PNG out). `@fal-ai/client` should use **`fal.subscribe('fal-ai/bria/background/remove', { input: { image_url } })`** unless docs mandate `fal.run`; pick one client API and document timeout/retry.
3. **Download BRIA result** to a buffer → **`normalizeDecodedSheetToPreset`** to preset `sheet` WxH → **`extractPngRegion`** per frame.
4. **Post-tile alpha:** If pipeline uses BRIA for the sheet, tiles can skip **`chromaKey`** (already RGBA) or run **`chromaKey`** after crops when **`preset.fal.chromaAfterBria`** is **true** (character walk defaults **on** for residual fringe / off-magenta). Optional: `postprocessSteps: ['chromaKey']` only when BRIA disabled for A/B.

- **Placement:** Prefer a **sheet-level step inside `runGenerateSheetPath`** (after T2I URL, before per-tile `extractPngRegion` / chroma) so `POSTPROCESS_REGISTRY` stays **per-tile RGBA operations** (`chromaKey` only). A registry entry that runs once per sheet would be awkward; only add `briaAlpha` to `POSTPROCESS_REGISTRY` if you unify “sheet ops” and “tile ops” later.

**Manifest:** Extend existing **`generationResults`** (see `pipeline.ts` — results merge into `manifest.generationResults`). Add **`alphaSource`** on **`generationResults._sheet`** (`'bria' | 'chroma' | 'none'`) and optionally duplicate on each frame for quick grep; keep **`chromaKeySource`** for chroma path only.

**Acceptance (Phase C):** Dpad sheet run with BRIA enabled yields RGBA tiles; manifest shows `alphaSource: 'bria'` on `_sheet`.

**Recipe version:** Bump **`RECIPE_VERSION_SHEET`** in `manifest.ts` when sheet pipeline semantics change (nano-banana + BRIA vs flux + chroma).

### Phase D — Preset and CLI wiring

**Goal:** `presets/dpad/dpad.ts` (or adjacent **`dpad-falsprite-preset.ts`**) sets:

- `fal.defaultEndpoint: "fal-ai/nano-banana-2"` for sheet strategy.
- **`fal.falExtrasSheet`** replaced or augmented with **nano-banana** fields (`aspect_ratio`, `resolution`, …)—**remove** Flux-only keys when endpoint is nano-banana to avoid silent ignores.

**`falExtras` when `--endpoint` overrides default (required fix):** Today `pipeline.ts` only merges `falExtrasSheet` / `falExtrasPerTile` when `endpoint === (preset.fal?.defaultEndpoint ?? DEFAULT_FAL_ENDPOINT)` (lines 246–247, 261–262). **Implement one of:**

- **A)** `preset.fal.extrasByEndpoint: Record<string, Record<string, unknown>>` keyed by full endpoint id, merged when `opts.endpoint` matches; or  
- **B)** Merge extras whenever the **endpoint family** matches (e.g. both `fal-ai/nano-banana-2`), derived from a small allowlist; or  
- **C)** Document that CLI overrides **drop** extras unless `--fal-extras-json @file` (if added).

Pick **A or B** for M1 so preset-tuned `aspect_ratio` / `resolution` survive `--endpoint` overrides used in CI.

**M1 default recommendation:** **Option B** — merge sheet/per-tile extras when `opts.endpoint` shares the same **family** as `preset.fal.defaultEndpoint` (e.g. helper `sameEndpointFamily(a, b)` true for two ids that differ only by version suffix, or both start with `fal-ai/nano-banana-2`). Use **Option A** (`extrasByEndpoint`) only if the same preset must ship **different** extra blobs for two distinct full endpoint strings under one workflow.

**Acceptance (Phase D):** Runbook command succeeds; manifest lists endpoint and `alphaSource` on `_sheet`.

---

## Milestone 1 — Definition of done

| # | Criterion |
|---|-----------|
| M1.1 | **Sheet strategy** generates **one** 400×100 (or configured) sheet via **`fal-ai/nano-banana-2`** with **`aspect_ratio: "4:1"`** (or equivalent that yields four equal columns after normalize). |
| M1.2 | **Preset** supplies style/composition/subject via existing `prompt.ts` builders **or** a **checked-in preset prompt module** (hardcoded acceptable). |
| M1.3 | **Four crops** match `SHEET_CROPS` in `presets/dpad/dpad.ts`; `assertPngBufferDimensions` passes after normalize. |
| M1.4 | **Alpha:** BRIA path **or** documented chroma fallback with **tunable** tolerance; no silent corner-median unless logged. |
| M1.5 | **Manifest** records endpoint, timings, and alpha source; **no** merge to `main` required for completion. |

**Non-goals (stretch):** Full N×N animation grid, nano-banana-pro/edit reference workflow, FalSprite UI.

**Per-tile vs sheet for M1:** Milestone 1 targets **sheet strategy** only (one 1×4 strip). **Per-tile** `fal-ai/nano-banana-2` calls reuse the same Phase A adapter but are **optional** follow-up once the sheet path is stable.

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| **Input schema drift** on fal models | Pin OpenAPI URLs in README; add smoke test that loads schema or snapshots expected keys |
| **Response shape** differs from Flux | Centralize parse in one function; test with fixture JSON |
| **Cost / latency** (rewrite + T2I + BRIA) | Make rewrite optional; log wall-clock per stage; document rough order-of-magnitude |
| **`falExtras` gating** when `--endpoint` overrides default | Refactor extras merge (Phase D) |
| **BRIA** removes needed pixels | Keep chroma path; tune prompts; optional mask later |

---

## Open questions (resolve during implementation)

1. **`resolution` enum** for nano-banana-2 (e.g. `0.5K` | `1K` | `2K` | `4K`): pick the smallest that yields acceptable glyph edges after normalize to 400×100; confirm in fal OpenAPI before locking.
2. **`fal-ai/nano-banana-2/edit`** vs **`fal-ai/nano-banana-pro/edit`:** out of M1 unless reference-image iteration is required.
3. **BRIA client API:** `subscribe` vs `run` — choose per `@fal-ai/client` + fal docs; behavior should match **one** documented pattern in code comments.

**Closed for planning purposes:** BRIA **input** is **`image_url`** from the T2I result URL (see Phase C). **Response shape** for image endpoints is still **`data.images[].url`** unless OpenAPI says otherwise—centralize parsing in Phase A.

---

## Runbook (current repo; extend when flags land)

**Live commands, flags (`--endpoint`, `--strategy`, `--keep-sheet`, …), env vars, and verified fal endpoint ids** are maintained in **`tools/sprite-generation/README.md`** (ADR + runbook). **`tools/dpad-workflow.ts`** is the CLI entry (run with **`node --experimental-strip-types`**, **`2gp-gwjc`**); **`npm run mock:dpad-workflow`** is the no-network CI path; **`FAL_KEY=… npm run dpad-workflow -- --mode generate --strategy sheet --keep-sheet`** exercises sheet generation with the preset default (`fal-ai/nano-banana-2`) and manifest `generationResults._sheet` fields (`alphaSource`, etc.). Update **README** when adding flags (e.g. `--matte bria`, `--rewrite`); keep this section as a pointer only.

---

## References

- FalSprite: https://github.com/lovisdotio/falsprite  
- fal model docs: `fal-ai/nano-banana-2`, `fal-ai/bria/background/remove`, `openrouter/router` (verify inputs on fal.ai OpenAPI)  
- Local: `generators/fal.ts`, `pipeline.ts`, `presets/dpad/dpad.ts`, `prompt.ts`, `pipeline-stages.ts`
