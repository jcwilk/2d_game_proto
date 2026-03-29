# Sprite generation (`tools/sprite-generation`)

Orchestration lives in **`pipeline.mjs`** (`runPipeline`): prompt → generator → postprocess → optional QA → manifest and sprite-ref.

## Local harness: `npm run mock:dpad-workflow`

The **primary** local command for the four-direction D-pad layout is **`npm run mock:dpad-workflow`**, which runs **`node tools/dpad-workflow.mjs --mode mock`**. It needs **no** `FAL_KEY` and **no** network; output is deterministic mock geometry suitable for CI and iteration.

**On-disk layout** (Vite `public/`, game-visible URLs): **`public/art/dpad/<frame>/dpad.png`** for **`up`**, **`down`**, **`left`**, **`right`**, plus **`manifest.json`** and **`sprite-ref.json`** beside the frame dirs. Frame order and sheet crops are defined by the preset — see **`presets/dpad.mjs`** (`createPreset`, `outBase`, `frames`, `SHEET_CROPS`, `spriteRef`).

| Concern | Where it lives |
| --- | --- |
| **Preset contract** (frames, sheet size, crops, `postprocessSteps`, QA grid, `fal` defaults) | **`presets/dpad.mjs`** |
| **Pipeline** (`runPipeline`, generators, postprocess, manifest / sprite-ref, QA loop) | **`pipeline.mjs`** |
| **QA bridge** (spawn **`tools/png-analyze.mjs`** per tile → `png-analyze.json` sidecars) | **`qa/analyze-bridge.mjs`** |

**CLI entry:** **`tools/dpad-workflow.mjs`** wires **`createPreset`** + **`runPipeline`**; use **`npm run dpad-workflow -- --help`** for flags (`--strategy sheet` \| `per-tile`, `--keep-sheet`, etc.).

### Optional live generation (`--mode generate`)

Run **`npm run dpad-workflow -- --mode generate`** (or `node tools/dpad-workflow.mjs --mode generate`). Set **`FAL_KEY`** in the environment ([fal.ai model APIs](https://docs.fal.ai/model-apis)).

**Limitations of live runs:** They **bill** the fal account and add **latency**; **T2I** pixels are **stochastic** (even with `--seed`, chroma and model variance remain). They require **network** and a **valid key** — unsuitable as the default CI path. Use **`mock`** for repeatable, free local runs; use **`generate`** when you need real model output against the same **geometry and manifest contract** as mock.

### Legacy: `flux-control-lora-canny`

Default dpad generation uses **`fal-ai/flux/dev`** (`DEFAULT_FAL_ENDPOINT` in **`presets/dpad.mjs`**). Earlier **`fal-ai/flux-control-lora-canny`**-based dpad flows are **not** recommended or default; treat them as **historical** context only.

## Strategy, scope, and fal endpoints (ADR)

This section is the **canonical** description of generation strategy, on-disk/game layout, alpha handling, and verified fal **endpoint id** strings. Other docs (e.g. **`../README.md`**) should **cross-link** here rather than duplicate conflicting sheet geometry.

**Verification date (endpoint ids + doc URLs):** `2026-03-28` (ISO). Endpoint strings were checked against the linked fal model **API** pages below.

### Reference strategies (not all implemented)

| Approach | Role in this repo |
| --- | --- |
| **FalSprite-style** (e.g. nano-banana + OpenRouter via fal, BRIA, grid tooling) | **Out of scope** — we do not replicate that full stack; see **Out of scope** below. |
| **Flux 2 Klein + 2×2 spritesheet LoRA** | **Not the production dpad contract.** A 2×2 Klein raster would need an explicit **crop/stitch** map or manifest/game changes to feed four directional tiles; not adopted until documented and implemented. |
| **FLUX.1 [dev] on fal + dpad preset** | **In scope — primary path:** defaults in **`presets/dpad.mjs`** (`DEFAULT_FAL_ENDPOINT`, sheet geometry, crops). |

### Chosen strategies (this repo)

1. **Sheet strategy** (`--strategy sheet` in **`dpad-workflow.mjs`**, default for generate): **one** fal job at **`preset.sheet`** size (**1×4** horizontal strip: width = `TILE_SIZE * 4`, height = `TILE_SIZE`), deterministic **`preset.sheet.crops`** → per-frame PNGs → **`postprocessSteps`** (see Alpha path). Optional **`--keep-sheet`** writes `sheet.png` beside the tiles for debugging.
2. **Per-tile strategy** (`--strategy per-tile`): **four** **`fal-ai/flux/dev`** jobs (same **`--seed`** when set), each at **`--image-size`** (default per-tile square from preset).

Tradeoffs: sheet = one latency bill and shared lighting; per-tile = more calls but independent framing and easier per-direction iteration.

### Out of scope (explicit)

- **Full FalSprite parity** (multi-model grids, OpenRouter routing, FalSprite UI).
- **Replacing** the dpad **1×4 + `frameKeyRect`** contract with **2×2 Klein** output **without** a written crop/stitch or manifest migration plan.

**BRIA matting** is implemented **once per sheet** in **`pipeline.mjs`** `runGenerateSheetPath` (not as a `POSTPROCESS_REGISTRY` tile step): T2I returns an HTTPS URL → **`fal-ai/bria/background/remove`** with **`image_url`** → download matted PNG → normalize → crop. Default when using **`fal-ai/nano-banana-2`** and **`preset.fal.sheetMatting`** is not **`'none'`**; set **`preset.fal.sheetMatting: 'none'`** for chroma-only on the raw T2I sheet (e.g. flux). Optional **`preset.fal.chromaAfterBria`** runs **`postprocessSteps`** on tiles after BRIA (usually unnecessary). Manifest **`generationResults._sheet.alphaSource`** is **`'bria'`** \| **`'chroma'`** \| **`'none'`** (mock).

### Runtime topology (game + `public/art`)

**Canonical production layout** for the D-pad preset:

- One **1×4** raster aligned with **`SHEET_CROPS`** in **`presets/dpad.mjs`** (order: up → down → left → right).
- Four **per-frame PNGs** under `public/art/dpad/<frame>/dpad.png` (basename configurable on the preset).
- **`sprite-ref.json`** with **`kind: 'frameKeyRect'`** — site-root URLs for each frame (see **`sprite-ref.mjs`**, **`src/art/atlasTypes.ts`**).

If a future pipeline emitted **2×2** (e.g. Klein), the repo would need a defined mapping (four crops or reassembly) and likely **manifest / loader** updates; until then, **do not** assume 2×2 for dpad.

### Alpha path: chroma vs BRIA (testable surface)

- **Per-tile postprocess:** only **`chromaKey`** is registered in **`POSTPROCESS_REGISTRY`** (`pipeline-stages.mjs`). The preset exposes **`postprocessSteps`**; **`resolvePostprocessSteps`** applies it in generate mode for **per-tile** and for **sheet** when alpha comes from **chroma** (flux) or when **`preset.fal.chromaAfterBria`** is set after BRIA. **`runPipeline`** passes **`chromaKeyHex`** (default **`#FF00FF`**) and tolerance into the chroma stage.
- **Sheet BRIA:** **`fal-ai/bria/background/remove`** runs **once per sheet** after T2I when **`shouldUseBriaSheetMatting`** is true (default for **`fal-ai/nano-banana-2`**; override with **`preset.fal.sheetMatting: 'none'`** or **`'bria'`**). Matted tiles skip chroma unless **`chromaAfterBria`**. **`generationResults._sheet.alphaSource`** records **`bria`** vs **`chroma`** vs **`none`** (mock).

**`resolveGeneratorConfig`** (`pipeline-stages.mjs`) merges **`preset.generatorConfig`** with runtime **`tileSize`**, **`seed`**, and sheet layout for mock/fal **shape** wiring — separate from postprocess ids but part of the same preset contract.

#### Default postprocess contract (dpad + generate defaults)

| Surface | Value |
| --- | --- |
| **`DEFAULT_POSTPROCESS_STEPS_GENERATE`** (`pipeline-stages.mjs`) | **`['chromaKey']`** |
| D-pad **`createPreset`** **`postprocessSteps`** | Same sequence (cloned from the constant above) |
| Default **`chromaKeyHex`** in prompts | **`#FF00FF`** — symbol **`DEFAULT_CHROMA_KEY_HEX`** in **`prompt.mjs`** |

### Verified fal endpoint ids

| Endpoint id | fal model API (docs) |
| --- | --- |
| `fal-ai/flux/dev` | https://fal.ai/models/fal-ai/flux/dev/api |

General client/queue/authentication: https://docs.fal.ai/model-apis

**Note:** **`tools/fal-raster-generate.mjs`** uses **`fal-ai/flux/dev`** for generic rasters (often 512²); that is **independent** of the dpad sheet dimensions above.

## Determinism vs T2I / chroma variance

Preset authors and QA should treat these as separate layers:

| Deterministic | Variable (stochastic / heuristic) |
| --- | --- |
| Sheet size, **`preset.sheet.crops`** origins, **`preset.tileSize`**, and **`extractPngRegion`** math — same inputs → same crop rectangles. | **T2I** pixels (model, seed, prompt, API). |
| **`preset.qa.spriteWidth`** / **`spriteHeight`** — fixed cell grid for png-analyze given those numbers. | **Chroma-key** and related postprocess (**`applyPostprocessPipeline`** in **`pipeline-stages.mjs`**) — tolerance and source pixels affect which samples become transparent; border-median style heuristics follow the image. |

Cross-critique intent: geometry and grid QA are **contract**; model and chroma behavior are **expect variance**, not bugs in crop math.

### Code pointers

- **`pipeline.mjs`** — calls **`applyPostprocessPipeline`** after generation (per-tile and sheet paths); QA loop calls **`runPngAnalyzeBridge`** → per-frame **`png-analyze.json`**.
- **`pipeline-stages.mjs`** — **`resolvePostprocessSteps`**, **`applyPostprocessPipeline`**, **`POSTPROCESS_REGISTRY`**.
- **`qa/analyze-bridge.mjs`** — invokes the png-analyze tool with sprite dimensions from the preset.
