# Sprite generation (`tools/sprite-generation`)

Orchestration lives in **`pipeline.mjs`** (`runPipeline`): prompt → generator → postprocess → optional QA → manifest and sprite-ref.

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

- **Full FalSprite parity** (multi-model grids, OpenRouter routing, BRIA-first pipelines as in external “FalSprite” references).
- **Replacing** the dpad **1×4 + `frameKeyRect`** contract with **2×2 Klein** output **without** a written crop/stitch or manifest migration plan.
- **BRIA** (or similar neural matting) as a **registered** `POSTPROCESS_REGISTRY` step — **not implemented**; reserved as a future id (see Alpha path).

### Runtime topology (game + `public/art`)

**Canonical production layout** for the D-pad preset:

- One **1×4** raster aligned with **`SHEET_CROPS`** in **`presets/dpad.mjs`** (order: up → down → left → right).
- Four **per-frame PNGs** under `public/art/dpad/<frame>/dpad.png` (basename configurable on the preset).
- **`sprite-ref.json`** with **`kind: 'frameKeyRect'`** — site-root URLs for each frame (see **`sprite-ref.mjs`**, **`src/art/atlasTypes.ts`**).

If a future pipeline emitted **2×2** (e.g. Klein), the repo would need a defined mapping (four crops or reassembly) and likely **manifest / loader** updates; until then, **do not** assume 2×2 for dpad.

### Alpha path: chroma vs BRIA (testable surface)

- **Implemented:** only **`chromaKey`** is registered in **`POSTPROCESS_REGISTRY`** (`pipeline-stages.mjs`). The preset exposes an ordered list **`postprocessSteps`**; **`resolvePostprocessSteps`** applies it in generate mode (see **Default postprocess contract** below). **`runPipeline`** passes **`chromaKeyHex`** (default **`#FF00FF`** — **`DEFAULT_CHROMA_KEY_HEX`** in **`prompt.mjs`**) and tolerance into the chroma stage. Prompts describe a flat **magenta** screen for T2I; the postprocess step keys that screen color to alpha (not “red chroma” — that phrase in older notes meant *chroma-keying* vs neural matting, not a red key color).
- **Future / placeholder:** a second step id such as **`briaAlpha`** (name TBD) would mean **BRIA**-class matting **after** fal download — **not in registry today**. Adding it requires a new registry entry, tests, and a follow-up ticket; until then treat **BRIA** as **out of scope** for automation, not silent behavior.

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
