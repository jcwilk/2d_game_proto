# Sprite generation (`tools/sprite-generation`)

Orchestration lives in **`pipeline.mjs`** (`runPipeline`): prompt → generator → postprocess → optional QA → manifest and sprite-ref.

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
