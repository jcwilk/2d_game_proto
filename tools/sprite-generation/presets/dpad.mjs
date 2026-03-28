/**
 * D-pad four-way tile preset — **single source of truth** for frame list, sheet layout,
 * fal tuning, QA grid size, and **`frameKeyRect`** sprite-ref paths under `public/`.
 *
 * ## Preset contract (`runPipeline` from **`../pipeline.mjs`**)
 *
 * **`createPreset(opts)`** returns an object matching **`PipelinePreset`**:
 *
 * - **`presetId`** / **`kind`** — Manifest `preset` and `kind`.
 * - **`frames`** — `GeneratorFrame[]` with `id`, `outSubdir`, `promptVariant`.
 * - **`outBase`** — Absolute directory for tiles, `manifest.json`, `sprite-ref.json`.
 * - **`tileSize`** — Square tile edge (px).
 * - **`sheet`** — `{ width, height, crops }` — required when `strategy === 'sheet'` (rectangular sheet pixel size + crop map).
 * - **`prompt`** — `{ frameStyle, frameComposition, sheetStyle, sheetComposition, sheetSubject }` for **`buildPrompt`** / **`buildSheetPrompt`**.
 * - **`fal`** — `{ defaultEndpoint, falExtrasPerTile, falExtrasSheet }` for default flux/dev jobs.
 * - **`qa`** — `{ spriteWidth, spriteHeight }` for png-analyze (8×8 cells on 256² when 32×32).
 * - **`provenance`** — Manifest `provenance.tool` + `.version`.
 * - **`spriteRef`** — **`kind: 'frameKeyRect'`** — per-frame PNG URLs under Vite `public/` (see **`../sprite-ref.mjs`**, **`src/art/atlasTypes.ts`** `parseFrameKeyRectManifestJson`).
 *
 * **`generatorConfig`** — Merged via **`resolveGeneratorConfig`** into mock **`generate`** / **`generateSheet`** (**`shapeForFrame`**, **`sheetLayout`**). **`postprocessSteps`** — generate mode only: ordered postprocess ids (**`POSTPROCESS_REGISTRY`** in **`../pipeline-stages.mjs`**); mock mode does not run these. Default when omitted: **`['chromaKey']`**.
 *
 * ## Determinism vs T2I / chroma variance
 *
 * **Deterministic:** **`TILE_SIZE`**, **`SHEET_WIDTH`** / **`SHEET_HEIGHT`**, **`SHEET_CROPS`**, **`QA_SPRITE_W`** / **`QA_SPRITE_H`** — sheet layout, crop coords, and png-analyze grid are fixed by these constants. **Variable:** model pixels and chroma/tolerance effects on keyed output. See **`../README.md`** and **`../pipeline.mjs`** (postprocess + **`runPngAnalyzeBridge`**).
 *
 * ## `recipeId`
 *
 * Not stored on the preset object. **`runPipeline`** stamps **`manifest.json`** via **`buildRecipeId`** in **`../manifest.mjs`** (`sprite-gen-dpad_four_way-*`). Use **`recipeIdForDpad(mode, strategy)`** to obtain the same id outside the pipeline. Version slugs (**`RECIPE_VERSION_*`**) live in **`manifest.mjs`** — bump when generation semantics change.
 *
 * @see `../README.md` — deterministic geometry vs stochastic T2I/chroma
 * @see `../pipeline.mjs` — orchestration, postprocess, QA analyze
 * @see `../manifest.mjs` — `buildRecipeId`, recipe version slugs
 */

import { defaultDpadShapeForFrame } from "../generators/mock.mjs";
import { buildRecipeId } from "../manifest.mjs";
import { sheetLayoutFromCrops } from "../sheet-layout.mjs";
import {
  DPAD_FRAME_COMPOSITION,
  DPAD_FRAME_STYLE,
  DPAD_SHEET_COMPOSITION,
  DPAD_SHEET_STYLE,
  DPAD_SHEET_SUBJECT,
} from "../prompt.mjs";

/** Manifest `preset` field and `buildRecipeId` segment. */
export const DPAD_PRESET_ID = "dpad_four_way";

/** Manifest `kind` for the four-way HUD tile set. */
export const DPAD_KIND = "dpad_tile_set";

/** Tile pixel size (width = height) for each d-pad direction cell. */
export const TILE_SIZE = 100;

/**
 * Single fal/mock sheet: **1×4** horizontal strip (four **`TILE_SIZE`** squares). Must match **`SHEET_CROPS`**.
 */
export const SHEET_WIDTH = TILE_SIZE * 4;
export const SHEET_HEIGHT = TILE_SIZE;

/** fal default; callers may override via `runPipeline` opts / CLI `--endpoint`. Plain txt2img when **`--no-control`**. */
export const DEFAULT_FAL_ENDPOINT = "fal-ai/flux/dev";

/** Per-tile generate with mock triangle control mask (Canny). See **`../control-image.mjs`**. */
export const DEFAULT_FAL_CONTROL_ENDPOINT = "fal-ai/flux-control-lora-canny";

/**
 * Extra fal input for sheet and per-tile jobs (`FluxDevInput` — no `negative_prompt` on flux/dev).
 */
export const DPAD_FAL_EXTRA_INPUT = {
  num_inference_steps: 40,
  /** FLUX/dev: small A/B range 3–5; lower can reduce over-stylized color fringing vs SDXL-style CFG. */
  guidance_scale: 4,
  acceleration: "none",
};

/**
 * fal input for **`fal-ai/flux-control-lora-canny`** (no `acceleration`; **`preprocess_depth: false`** for Canny edges).
 * @see https://fal.ai/models/fal-ai/flux-control-lora-canny/api
 */
export const DPAD_FAL_CONTROL_EXTRA_INPUT = {
  num_inference_steps: 32,
  /** Slightly higher than fal default so prompt can steer texture while control stays loose. */
  guidance_scale: 4,
  output_format: "png",
  preprocess_depth: false,
  /** Lower than ~1.0 — looser fit to the triangle mask; pair with softened control image in pipeline. */
  control_lora_strength: 0.58,
};

/** Grid cell size for png-analyze (5×5 cells on 100²). */
export const QA_SPRITE_W = 20;
export const QA_SPRITE_H = 20;

/**
 * D-pad preset: ordered frames (up → down → left → right in list; generation order is this list).
 *
 * @type {readonly import('../generators/types.mjs').GeneratorFrame[]}
 */
export const DPAD_FRAMES = Object.freeze([
  {
    id: "up",
    outSubdir: "up",
    promptVariant:
      `Orientation NORTH (up): one isosceles triangle only, pointing straight up. ` +
      `Apex sits on the top edge at horizontal center; the base is a horizontal segment below the apex, parallel to the bottom edge. ` +
      `Flat 2D orthographic symbol only — no perspective, no 3D block, no extrusion, no chevron pair.`,
  },
  {
    id: "down",
    outSubdir: "down",
    promptVariant:
      `Orientation SOUTH (down): one isosceles triangle only, pointing straight down. ` +
      `Apex sits on the bottom edge at horizontal center; the base is a horizontal segment above the apex. ` +
      `Flat 2D orthographic symbol only — no perspective, no 3D block, no extrusion, no chevron pair.`,
  },
  {
    id: "left",
    outSubdir: "left",
    promptVariant:
      `Orientation WEST (left): one isosceles triangle only, pointing straight left toward the left edge. ` +
      `The tip touches the left edge at vertical midline; the base is a vertical segment on the right half of the tile. ` +
      `The triangle must be wider than tall (landscape), not a tall vertical sliver. ` +
      `Do not draw an upward or downward arrow; this is a horizontal-left control glyph. ` +
      `Flat 2D orthographic symbol only — no perspective, no 3D block.`,
  },
  {
    id: "right",
    outSubdir: "right",
    promptVariant:
      `Orientation EAST (right): one isosceles triangle only, pointing straight right toward the right edge. ` +
      `The tip touches the right edge at vertical midline; the base is a vertical segment on the left half of the tile. ` +
      `The triangle must be wider than tall (landscape), not a tall vertical sliver. ` +
      `Do not draw an upward, downward, or leftward arrow. ` +
      `Flat 2D orthographic symbol only — no perspective, no 3D block.`,
  },
]);

/**
 * Top-left origins for each frame in the 400×100 sheet (1×4 row: up → down → left → right).
 *
 * @type {Readonly<Record<string, { x: number; y: number }>>}
 */
export const SHEET_CROPS = Object.freeze({
  up: { x: 0, y: 0 },
  down: { x: TILE_SIZE, y: 0 },
  left: { x: TILE_SIZE * 2, y: 0 },
  right: { x: TILE_SIZE * 3, y: 0 },
});

/**
 * Mock `generateSheet` cell layout — **not** independent of **`SHEET_CROPS`**; same mapping as
 * **`sheetLayoutFromCrops`** in **`../sheet-layout.mjs`** so compositor placement matches crop extraction.
 *
 * @type {Readonly<Record<string, { x: number; y: number }>>}
 */
export const DPAD_SHEET_LAYOUT = Object.freeze(sheetLayoutFromCrops(SHEET_CROPS, TILE_SIZE));

/**
 * Same **`recipeId`** string **`runPipeline`** writes to **`manifest.json`** for this preset.
 *
 * @param {'mock'|'generate'} mode
 * @param {'per-tile'|'sheet'} [strategy] Required when `mode === 'generate'`.
 */
export function recipeIdForDpad(mode, strategy) {
  return buildRecipeId({
    preset: DPAD_PRESET_ID,
    mode,
    ...(mode === "generate" ? { strategy } : {}),
  });
}

/**
 * @typedef {object} CreateDpadPresetOpts
 * @property {string} outBase Absolute output root (e.g. `.../public/art/dpad`).
 * @property {string} [artUrlPrefix='art/dpad'] Site-root-relative prefix for sprite-ref `images` (no `public/`, no leading slash).
 * @property {string} [pngFilename='dpad.png'] Basename in each frame folder.
 * @property {string} [spriteRefJsonRelativePath='sprite-ref.json'] Written under `outBase`.
 * @property {string} [provenanceTool='tools/sprite-generation/presets/dpad.mjs']
 * @property {number} [provenanceVersion=1]
 */

/**
 * Full **`PipelinePreset`** for the D-pad workflow (pass to **`runPipeline`**).
 *
 * @param {CreateDpadPresetOpts} opts
 */
export function createPreset(opts) {
  const outBase = opts?.outBase;
  if (typeof outBase !== "string" || !outBase.trim()) {
    throw new Error("createPreset(dpad): outBase (non-empty string, absolute output directory) is required");
  }

  const artUrlPrefix = opts.artUrlPrefix ?? "art/dpad";
  const pngFilename = opts.pngFilename ?? "dpad.png";
  const spriteRefJsonRelativePath = opts.spriteRefJsonRelativePath ?? "sprite-ref.json";
  const provenanceTool = opts.provenanceTool ?? "tools/sprite-generation/presets/dpad.mjs";
  const provenanceVersion = opts.provenanceVersion ?? 1;

  for (const f of DPAD_FRAMES) {
    if (!(f.id in SHEET_CROPS)) {
      throw new Error(`createPreset(dpad): SHEET_CROPS missing entry for frame id "${f.id}"`);
    }
  }

  return {
    presetId: DPAD_PRESET_ID,
    kind: DPAD_KIND,
    frames: DPAD_FRAMES,
    outBase,
    tileSize: TILE_SIZE,
    sheet: {
      width: SHEET_WIDTH,
      height: SHEET_HEIGHT,
      crops: { ...SHEET_CROPS },
    },
    prompt: {
      frameStyle: DPAD_FRAME_STYLE,
      frameComposition: DPAD_FRAME_COMPOSITION,
      sheetStyle: DPAD_SHEET_STYLE,
      sheetComposition: DPAD_SHEET_COMPOSITION,
      sheetSubject: DPAD_SHEET_SUBJECT,
    },
    fal: {
      defaultEndpoint: DEFAULT_FAL_ENDPOINT,
      controlEndpoint: DEFAULT_FAL_CONTROL_ENDPOINT,
      /** When **true** (default), per-tile **`mode: generate`** uses control Canny + **`control-image`** mask. CLI **`--no-control`** sets false. */
      useControlCanny: true,
      falExtrasPerTile: { ...DPAD_FAL_EXTRA_INPUT },
      falExtrasSheet: { ...DPAD_FAL_EXTRA_INPUT },
      falExtrasControl: { ...DPAD_FAL_CONTROL_EXTRA_INPUT },
    },
    qa: { spriteWidth: QA_SPRITE_W, spriteHeight: QA_SPRITE_H },
    provenance: { tool: provenanceTool, version: provenanceVersion },
    generatorConfig: {
      shapeForFrame: defaultDpadShapeForFrame,
      sheetLayout: DPAD_SHEET_LAYOUT,
    },
    /** Explicit default for documentation; same as `pipeline-stages` default for generate. */
    postprocessSteps: ["chromaKey"],
    spriteRef: {
      kind: "frameKeyRect",
      jsonRelativePath: spriteRefJsonRelativePath,
      artUrlPrefix: artUrlPrefix.replace(/\/$/, ""),
      pngFilename,
    },
  };
}
