# Sprite generation (`tools/sprite-generation`)

**Cursor skill (agent workflow):** **`.cursor/skills/generate-spritesheet/SKILL.md`**. **Unified CLI:** **`npm run generate:spritesheet`** → **`node --experimental-strip-types tools/generate-spritesheet.ts`** (registry-driven **`run`** / **`list`** / **`status`** / **`info`**; same **`2gp-gwjc`** runner as other **`.ts`** tools). For **live** runs, keep fal credentials in repo-root **`.env`** — the CLI loads it automatically when present (existing **`process.env`** wins). **Canonical flags:** run **`node --experimental-strip-types tools/generate-spritesheet.ts help`** (e.g. **`help run`**) — this README does not duplicate the full flag list.

**`status` and `stale=`:** The CLI compares the preset module against each asset’s **`manifest.json`** and **`sheet.png`** (paths under **`public/art/…`**). It first tries **`git log -1 --format=%ct -- <path>`** per file. If the preset **and** at least one art path return a git timestamp, **`stale`** means the preset’s latest commit is **newer** than the newest art commit; **`fresh`** means art is at least as new as the preset. If **git is missing**, the **`git`** call fails, or **any** path has **no** git history (including **untracked** files — empty `git log` for that path), it falls back to **filesystem `mtime`** with the same newer/older rule. **`unknown`** is reported only when the fallback cannot run: the preset file is missing, or **all** art paths are missing (nothing to compare).

Orchestration lives in **`pipeline.ts`** (`runPipeline`): prompt → generator → postprocess → optional QA → manifest and sprite-ref.

## Mock vs live (fal) vs sprite-ref (layering)

Think of three layers that stack on top of the same **preset contract** (see **`preset-contract.ts`** — what each **`presets/<slug>/<slug>.ts`** must export; runtime shape in **`pipeline.ts`** → **`PipelinePreset`**):

1. **Mock generator** — **`runPipeline`** with internal mode **`mock`** (unified CLI **`--mode mock`**). Uses **`generators/mock.ts`** so sheets/tiles need **no** **`FAL_KEY`** and **no** network. Output is **deterministic** placeholder geometry that still exercises **crops**, **manifest** layout, and **sprite-ref** wiring the same way as live for that preset.
2. **Live / fal** — internal mode **`generate`** (CLI **`--mode live`**). **`generators/fal.ts`** runs T2I (and usually **BRIA** matting for nano-banana sheets), optional **OpenRouter** sheet rewrite from **`preset.fal.sheetRewrite`**, then the same **postprocess** / **QA** / **writes** as mock. Pixels are **stochastic**; geometry (crop map, frame ids, sheet grid) stays **preset-driven**.
3. **Sprite-ref** — not a separate “mode”: **`sprite-ref.ts`** **`writeSpriteRef`** runs **after** generation inside **`runPipeline`**, producing **`sprite-ref.json`** beside **`manifest.json`** (and **`sheet.png`** / per-frame PNGs depending on preset). It records **`frameKeyRect`** vs **`gridFrameKeys`** so the game can resolve URLs/crops without re-deriving layout from raw PNGs.

Shared **character walk** strip geometry and fal/chroma defaults live under **`presets/lib/`** (especially **`character-defaults.ts`** and **`character-preset.ts`** **`createCharacterStripPreset`**). **Prompt identity** (NPC vs player, art direction) stays in each **`presets/<slug>/<slug>.ts`** module — that split is the same idea as **`merchant-character`** vs **`avatar-character`**.

### Forking a character preset (merchant-style)

To add a **new** walk-cycle NPC (same **1×N** strip machinery as **`avatar-character`**, new **`kind`** / manifest **`preset`**):

1. **Copy** **`presets/merchant-character/`** (or **`avatar-character/`**) to **`presets/<your-slug>/`** and rename the module to **`your-slug.ts`** (directory name and **`ASSET_ID`** must match — enforced by **`presets/registry.ts`**).
2. In the new module, set unique **`ASSET_ID`**, **`MANIFEST_PRESET_ID`**, and **`KIND`**; point defaults at **`art/<your-slug>`** via **`artUrlPrefix`** in **`createPreset`** (and **`provenanceTool`** to this file).
3. Replace **prompt** strings / frame **`promptVariant`**s for the new character; keep using **`createCharacterStripPreset`** + **`../lib/character-defaults.ts`** if you want the same strip dimensions and fal defaults as other walk presets.
4. **No manual registry entry:** any **`presets/<slug>/<slug>.ts`** is auto-discovered. Run **`npm run generate:spritesheet -- list`** and **`run --asset <slug> --mode mock`** to verify.

For a full in-repo example of “forked” identity on shared lib geometry, see **`presets/merchant-character/merchant-character.ts`**.

**Drag-to-stuck HUD orb** (four frames, **`specs/drag-stun-hud.md`**): preset **`hud-drag-orb`** — **`MANIFEST_PRESET_ID`** **`hud_drag_orb`**, committed art under **`public/art/hud-drag-orb/`** (`sheet.png` + **`sprite-ref.json`** with **`gridFrameKeys`**; stable frame keys **`idle`**, **`activate_1`**, **`activate_2`**, **`activate_3`** in a **1×4** row-major strip). Verify with **`npm run generate:spritesheet -- list`** and **`run --asset hud-drag-orb --mode mock`**.

## Local harness: `npm run mock:dpad-workflow`

The **primary** local command for the four-direction D-pad layout is **`npm run mock:dpad-workflow`**, which runs **`node --experimental-strip-types tools/dpad-workflow.ts --mode mock`**. It needs **no** `FAL_KEY` and **no** network; output is deterministic mock geometry suitable for CI and iteration.

**On-disk layout** (Vite `public/`, game-visible URLs): **`public/art/<slug>/<frame>/<basename>.png`** (e.g. **`up`**, **`down`**, **`left`**, **`right`** for a four-way HUD), plus **`manifest.json`** and **`sprite-ref.json`** beside the frame dirs. Frame order and sheet crops are defined by the preset — see **`presets/<slug>/<slug>.ts`** (`createPreset`, `outBase`, `frames`, `SHEET_CROPS`, `spriteRef`).

| Concern | Where it lives |
| --- | --- |
| **Preset contract** (frames, sheet size, crops, `postprocessSteps`, QA grid, `fal` defaults) | **`presets/<slug>/<slug>.ts`** |
| **Pipeline** (`runPipeline`, generators, postprocess, manifest / sprite-ref, QA loop) | **`pipeline.ts`** |
| **QA bridge** (spawn **`node --experimental-strip-types tools/png-analyze.ts`** per tile → `png-analyze.json` sidecars) | **`qa/analyze-bridge.ts`** |

**CLI entry:** **`tools/dpad-workflow.ts`** wires **`createPreset`** + **`runPipeline`**; use **`npm run dpad-workflow -- --help`** for flags (`--strategy sheet` \| `per-tile`, `--keep-sheet`, **`--endpoint`**, optional **`--rewrite`** for sheet OpenRouter prompt rewrite before T2I, etc.).

**Character walk** (four frames, art under **`public/art/<id>/`**): **`npm run generate:spritesheet -- run --asset <id> --mode mock|live`** (unified CLI, **`tools/generate-spritesheet.ts`**) loads **`presets/<slug>/<slug>.ts`** for the matching slug. Run **`list`** to see ids. The **first sheet cell** (top-left, **`walk_0`**) is **idle standing**; **`CHARACTER_FALSPRITE_SHEET_SUBJECT`** in that preset defines the falsprite “CHARACTER AND ANIMATION DIRECTION” line (not shared defaults in **`prompt.ts`**). Sheet T2I follows [falsprite](https://github.com/lovisdotio/falsprite)-style prompting (**`buildFalspriteStyleSpritePrompt`** + OpenRouter **`CHARACTER_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT`** in **`prompt.ts`**) on a **2×2** grid ( **`SHEET_WIDTH`×`SHEET_HEIGHT`** = `2×TILE_SIZE` square). Nano-banana **`falExtrasSheet`** uses **`1:1`** + **`0.5K`** + **`expand_prompt`** + **`safety_tolerance`** (see preset); art direction is **illustrated / painterly 2D** (not pixel art), **`CHARACTER_WALK_FRAME_STYLE`** in the preset. Alpha is **BRIA** (`fal-ai/bria/background/remove`). **`chromaAfterBria`** defaults **off** (no per-tile chroma). Output is **sheet-only** (**`sheetOnlyOutput`**): **`sheet.png`** + **`sprite-ref.json`** with **`kind: 'gridFrameKeys'`** (no **`walk_*`** tile PNGs). **`sheetNativeRaster`** is **on**: the saved sheet matches fal/BRIA output size (no NN downscale to the nominal **`SHEET_WIDTH`×`SHEET_HEIGHT`**); **`sprite-ref.json`** **`grid.spriteWidth` / `spriteHeight`** follow the raster. Other presets still use **`normalizeDecodedSheetToPreset`** when model size ≠ preset.

### Optional live generation (`--mode generate`)

Run **`npm run dpad-workflow -- --mode generate`** (or `node --experimental-strip-types tools/dpad-workflow.ts --mode generate`). Set **`FAL_KEY`** in the environment ([fal.ai model APIs](https://docs.fal.ai/model-apis)).

**Default T2I** for the directional HUD preset is **`fal-ai/nano-banana-2`** (see **`presets/<slug>/<slug>.ts`** `DEFAULT_FAL_ENDPOINT`). Sheet jobs use **`fal.falExtrasSheet`** (`aspect_ratio`, `resolution`, …). **`--endpoint`** overrides the model id; preset extras still merge when the override is in the **same endpoint family** as the preset default (nano-banana variants share one family; Flux `fal-ai/flux/*` share another) — implemented in **`pipeline.ts`** via **`sameImageEndpointFamily`** in **`generators/fal.ts`**.

**Example (real API, bills account):**

```bash
FAL_KEY=… npm run dpad-workflow -- --mode generate --strategy sheet --keep-sheet
```

**Limitations of live runs:** They **bill** the fal account and add **latency**; **T2I** pixels are **stochastic** (even with `--seed`, chroma and model variance remain). They require **network** and a **valid key** — unsuitable as the default CI path. Use **`mock`** for repeatable, free local runs; use **`generate`** when you need real model output against the same **geometry and manifest contract** as mock.

### Legacy: `flux-control-lora-canny`

Default generation for that HUD preset uses **`fal-ai/nano-banana-2`** (`DEFAULT_FAL_ENDPOINT` in **`presets/<slug>/<slug>.ts`**). Use **`--endpoint fal-ai/flux/dev`** for Flux-shaped txt2img + chroma (no BRIA by default). Earlier **`fal-ai/flux-control-lora-canny`**-based flows for the same layout are **not** recommended or default; treat them as **historical** context only.

## Strategy, scope, and fal endpoints (ADR)

This section is the **canonical** description of generation strategy, on-disk/game layout, alpha handling, and verified fal **endpoint id** strings. Other docs (e.g. **`../README.md`**) should **cross-link** here rather than duplicate conflicting sheet geometry.

**Verification date (endpoint ids + doc URLs):** `2026-03-28` (ISO). Endpoint strings were checked against the linked fal model **API** pages below.

### Reference strategies (not all implemented)

| Approach | Role in this repo |
| --- | --- |
| **FalSprite (full app / generic N×N UI)** | **Out of scope** — we do not ship that UI. **Same model stack** (nano-banana, BRIA, optional OpenRouter on fal) is used by **presets** where documented; see **`FALSPRITE_INTEGRATION_PLAN.md`**. |
| **Flux 2 Klein + 2×2 spritesheet LoRA** | **Not the production four-direction HUD contract.** A 2×2 Klein raster would need an explicit **crop/stitch** map or manifest/game changes to feed four directional tiles; not adopted until documented and implemented. |
| **nano-banana-2 + BRIA + HUD preset** | **In scope — primary path:** defaults in **`presets/<slug>/<slug>.ts`** (`DEFAULT_FAL_ENDPOINT`, sheet geometry, crops, nano **`falExtrasSheet`**). |
| **FLUX.1 [dev] on fal + HUD preset** | **In scope — alternate:** pass **`--endpoint fal-ai/flux/dev`**; Flux-shaped **`falExtras`** apply only within the Flux family. |

### Chosen strategies (this repo)

1. **Sheet strategy** (`--strategy sheet` in **`dpad-workflow.ts`**, default for generate): **one** fal job at **`preset.sheet`** size (**1×4** horizontal strip: width = `TILE_SIZE * 4`, height = `TILE_SIZE`), deterministic **`preset.sheet.crops`** → per-frame PNGs → **`postprocessSteps`** (see Alpha path). Optional **`--keep-sheet`** writes `sheet.png` beside the tiles for debugging.
2. **Per-tile strategy** (`--strategy per-tile`): **four** T2I jobs (same **`--seed`** when set), each at **`--image-size`** (default per-tile square from preset); default endpoint **`fal-ai/nano-banana-2`** with per-tile **`falExtras`** (`aspect_ratio: "1:1"`, etc.).

Tradeoffs: sheet = one latency bill and shared lighting; per-tile = more calls but independent framing and easier per-direction iteration.

### Out of scope (explicit)

- **Full FalSprite parity** (multi-model grids, OpenRouter routing, FalSprite UI).
- **Replacing** the four-direction HUD **1×4 + `frameKeyRect`** contract with ad-hoc **2×2** output **without** updating **`manifest.ts`**, **`sprite-ref.ts`**, and loaders (walk-cycle sheet presets use **2×2 + `gridFrameKeys`** — the HUD preset remains **1×4**).

**BRIA matting** is implemented **once per sheet** in **`pipeline.ts`** `runGenerateSheetPath` (not as a `POSTPROCESS_REGISTRY` tile step): T2I returns an HTTPS URL → **`fal-ai/bria/background/remove`** with **`image_url`** → download matted PNG → normalize → crop. Default when using **`fal-ai/nano-banana-2`** and **`preset.fal.sheetMatting`** is not **`'none'`**; set **`preset.fal.sheetMatting: 'none'`** for chroma-only on the raw T2I sheet (e.g. flux). **`preset.fal.chromaAfterBria`** (walk-cycle presets default **off**; other presets may use **`on`**) runs **`postprocessSteps`** on tiles **after** BRIA when **`sheetOnlyOutput`** is false. Manifest **`generationResults._sheet.alphaSource`** is **`'bria'`** \| **`'chroma'`** \| **`'none'`** (mock).

### Runtime topology (game + `public/art`)

**Canonical production layout** for the four-direction HUD preset (per-frame tiles):

- One **1×4** raster aligned with **`SHEET_CROPS`** in **`presets/<slug>/<slug>.ts`** (order: up → down → left → right).
- Four **per-frame PNGs** under `public/art/<slug>/<frame>/<basename>.png` (basename configurable on the preset).
- **`sprite-ref.json`** with **`kind: 'frameKeyRect'`** — site-root URLs for each frame (see **`sprite-ref.ts`**, **`src/art/atlasTypes.ts`**).

Walk-cycle sheet presets use **2×2** + **`gridFrameKeys`** (`sheet.png` + `sprite-ref.json`); the per-frame HUD preset remains **1×4** + **`frameKeyRect`** (per-frame PNGs). **Do not** assume the same layout for both asset kinds.

### Alpha path: chroma vs BRIA (testable surface)

- **Per-tile postprocess:** only **`chromaKey`** is registered in **`POSTPROCESS_REGISTRY`** (`pipeline-stages.ts`). The preset exposes **`postprocessSteps`**; **`resolvePostprocessSteps`** applies it in generate mode for **per-tile** and for **sheet** when alpha comes from **chroma** (flux) or when **`preset.fal.chromaAfterBria`** is set after BRIA. **`runPipeline`** passes **`chromaKeyHex`** (default **`#FF00FF`**) and tolerance into the chroma stage.
- **Sheet BRIA:** **`fal-ai/bria/background/remove`** runs **once per sheet** after T2I when **`shouldUseBriaSheetMatting`** is true (default for **`fal-ai/nano-banana-2`**; override with **`preset.fal.sheetMatting: 'none'`** or **`'bria'`**). Matted tiles run **`chromaKey`** after crop when **`chromaAfterBria`** is set (walk-cycle presets: default **off**; sheet-only presets skip per-tile crops). **`generationResults._sheet.alphaSource`** records **`bria`** vs **`chroma`** vs **`none`** (mock).

**`resolveGeneratorConfig`** (`pipeline-stages.ts`) merges **`preset.generatorConfig`** with runtime **`tileSize`**, **`seed`**, and sheet layout for mock/fal **shape** wiring — separate from postprocess ids but part of the same preset contract.

#### Default postprocess contract (registry presets + generate defaults)

| Surface | Value |
| --- | --- |
| **`DEFAULT_POSTPROCESS_STEPS_GENERATE`** (`pipeline-stages.ts`) | **`['chromaKey']`** |
| Directional HUD **`createPreset`** **`postprocessSteps`** | Same sequence (cloned from the constant above) |
| Default **`chromaKeyHex`** in prompts | **`#FF00FF`** — symbol **`DEFAULT_CHROMA_KEY_HEX`** in **`prompt.ts`** |

### Verified fal endpoint ids

| Endpoint id | fal model API (docs) |
| --- | --- |
| `fal-ai/nano-banana-2` | https://fal.ai/models/fal-ai/nano-banana-2/api |
| `fal-ai/flux/dev` | https://fal.ai/models/fal-ai/flux/dev/api |

General client/queue/authentication: https://docs.fal.ai/model-apis

**Note:** **`tools/fal-raster-generate.ts`** uses **`fal-ai/flux/dev`** for generic rasters (often 512²); that is **independent** of the HUD 1×4 sheet dimensions above.

## Determinism vs T2I / chroma variance

Preset authors and QA should treat these as separate layers:

| Deterministic | Variable (stochastic / heuristic) |
| --- | --- |
| Sheet size, **`preset.sheet.crops`** origins, **`preset.tileSize`**, and **`extractPngRegion`** math — same inputs → same crop rectangles. | **T2I** pixels (model, seed, prompt, API). |
| **`preset.qa.spriteWidth`** / **`spriteHeight`** — fixed cell grid for png-analyze given those numbers. | **Chroma-key** and related postprocess (**`applyPostprocessPipeline`** in **`pipeline-stages.ts`**) — tolerance and source pixels affect which samples become transparent; border-median style heuristics follow the image. |

Cross-critique intent: geometry and grid QA are **contract**; model and chroma behavior are **expect variance**, not bugs in crop math.

### Code pointers

- **`pipeline.ts`** — calls **`applyPostprocessPipeline`** after generation (per-tile and sheet paths); QA loop calls **`runPngAnalyzeBridge`** → per-frame **`png-analyze.json`**.
- **`pipeline-stages.ts`** — **`resolvePostprocessSteps`**, **`applyPostprocessPipeline`**, **`POSTPROCESS_REGISTRY`**.
- **`qa/analyze-bridge.ts`** — invokes the png-analyze tool with sprite dimensions from the preset.
