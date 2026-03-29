/**
 * Character walk-cycle preset — **single source of truth** for frame list, sheet layout,
 * fal tuning, QA grid, and **`gridFrameKeys`** sprite-ref under `public/art/character/`.
 *
 * Contract matches **`presets/dpad.mjs`** (`PipelinePreset`, `runPipeline` from **`../pipeline.mjs`**).
 * **`fal.sheetRewrite`** defaults to **on** for generate sheet (OpenRouter via **`FAL_KEY`**); override with **`tools/character-workflow.mjs --no-rewrite`**.
 *
 * **Transparency:** **BRIA** is the alpha path; **`fal.chromaAfterBria`** defaults to **off** (FalSprite-style BRIA-only; no per-tile chroma).
 *
 * **T2I:** Sheet jobs use **`fal-ai/nano-banana-2`** with **`CHARACTER_FAL_EXTRAS_SHEET`** (**1:1**, **2K**, **`expand_prompt`**, **`safety_tolerance`**) aligned with [falsprite](https://github.com/lovisdotio/falsprite). Prompt text follows **`buildFalspriteStyleSpritePrompt`** + **`CHARACTER_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT`** (see **`../prompt.mjs`**).
 *
 * **Output:** **`sheetOnlyOutput`** — one **`sheet.png`** + **`sprite-ref.json`** (`gridFrameKeys`); no **`walk_*`** tile PNGs.
 *
 * @see `../README.md`
 * @see `../pipeline.mjs`
 * @see `../manifest.mjs` — `buildRecipeId`
 */

import {
  NANO_BANANA2_DEFAULT_RESOLUTION,
  NANO_BANANA2_HIGH_RESOLUTION,
  NANO_BANANA2_SQUARE_ASPECT_RATIO,
} from "../generators/fal.mjs";
import { renderCharacterWalkMockTileBuffer } from "../generators/mock.mjs";
import { buildRecipeId } from "../manifest.mjs";
import {
  buildFalspriteStyleSpritePrompt,
  CHARACTER_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT,
  CHARACTER_WALK_FRAME_COMPOSITION,
  CHARACTER_WALK_FRAME_PROMPT_SUFFIX,
  CHARACTER_WALK_FRAME_STYLE,
  CHARACTER_WALK_SHEET_COMPOSITION,
  CHARACTER_WALK_SHEET_STYLE,
  CHARACTER_WALK_SHEET_SUBJECT,
} from "../prompt.mjs";
import { sheetLayoutFromCrops } from "../sheet-layout.mjs";

/** Manifest `preset` field and `buildRecipeId` segment. */
export const CHARACTER_PRESET_ID = "character_walk";

/** Manifest `kind` for the walk sprite set. */
export const CHARACTER_KIND = "character_walk_sprite";

/** Square tile edge (px) per walk frame. */
export const TILE_SIZE = 64;

/**
 * Default Euclidean RGB distance for the main chroma pass (per-tile strategy only). Higher keys more near-magenta pixels but can eat
 * costume pinks/purples; override with **`tools/character-workflow.mjs --chroma-tolerance`**.
 */
export const CHARACTER_CHROMA_TOLERANCE_DEFAULT = 120;

/**
 * Looser Euclidean distance **only** on pixels that border transparency (after main chroma). Keep this
 * moderately above **`CHARACTER_CHROMA_TOLERANCE_DEFAULT`**; too high keys pinks/purples in the figure.
 */
export const CHARACTER_CHROMA_FRINGE_EDGE_DIST = 165;

/**
 * After silhouette peel: remove **semi-transparent** pixels (BRIA edge halos) within this Euclidean
 * distance of the key. Opaque pixels are untouched. **`0`** disables (via CLI / **`runPipeline`**).
 */
export const CHARACTER_CHROMA_SPILL_MAX_DIST = 205;

/** Single sheet: **2×2** grid (four **`TILE_SIZE`** squares). Must match **`SHEET_CROPS`**. */
export const SHEET_WIDTH = TILE_SIZE * 2;
export const SHEET_HEIGHT = TILE_SIZE * 2;

/** fal default; callers may override via `runPipeline` opts / CLI `--endpoint`. */
export const DEFAULT_FAL_ENDPOINT = "fal-ai/nano-banana-2";

/**
 * Nano-banana sheet inputs: **1:1** + **2K** + falsprite extras — matches upstream `api/generate.mjs` text-only path.
 */
export const CHARACTER_FAL_EXTRAS_SHEET = {
  aspect_ratio: NANO_BANANA2_SQUARE_ASPECT_RATIO,
  resolution: NANO_BANANA2_HIGH_RESOLUTION,
  expand_prompt: true,
  safety_tolerance: 2,
};

export const CHARACTER_FAL_EXTRAS_PER_TILE = {
  aspect_ratio: "1:1",
  resolution: NANO_BANANA2_DEFAULT_RESOLUTION,
};

/** Short seed for OpenRouter (falsprite-style user message); not the full T2I block. */
export const CHARACTER_WALK_SHEET_REWRITE_USER_SEED =
  "Stylized 2D side-view game character walk cycle — four frames in reading order: contact left, passing, contact right, passing — single consistent identity and outfit.";

/** png-analyze cell size (4×4 grid on 64²). */
export const QA_SPRITE_W = 16;
export const QA_SPRITE_H = 16;

/**
 * Ordered walk frames: contact left → passing → contact right → passing.
 *
 * @type {readonly import('../generators/types.mjs').GeneratorFrame[]}
 */
export const CHARACTER_WALK_FRAMES = Object.freeze([
  {
    id: "walk_0",
    outSubdir: "walk_0",
    promptVariant:
      `Walk frame 1 of 4: left foot forward / weight on right, right foot back — side-view or three-quarter pixel silhouette, consistent proportions with other frames.`,
  },
  {
    id: "walk_1",
    outSubdir: "walk_1",
    promptVariant:
      `Walk frame 2 of 4: passing / mid-stride, both feet under body — same character as other frames.`,
  },
  {
    id: "walk_2",
    outSubdir: "walk_2",
    promptVariant:
      `Walk frame 3 of 4: right foot forward / weight on left, left foot back — same character as other frames.`,
  },
  {
    id: "walk_3",
    outSubdir: "walk_3",
    promptVariant:
      `Walk frame 4 of 4: passing / mid-stride alternate — same character as other frames.`,
  },
]);

/**
 * Top-left origins in the 128×128 sheet (row-major: walk_0 walk_1 / walk_2 walk_3).
 *
 * @type {Readonly<Record<string, { x: number; y: number }>>}
 */
export const SHEET_CROPS = Object.freeze({
  walk_0: { x: 0, y: 0 },
  walk_1: { x: TILE_SIZE, y: 0 },
  walk_2: { x: 0, y: TILE_SIZE },
  walk_3: { x: TILE_SIZE, y: TILE_SIZE },
});

/**
 * Logical frame → grid cell (**column**, **row**) for **`sprite-ref.json`** (`gridFrameKeys`).
 *
 * @type {Readonly<Record<string, { column: number; row: number }>>}
 */
export const CHARACTER_FRAME_SHEET_CELLS = Object.freeze({
  walk_0: { column: 0, row: 0 },
  walk_1: { column: 1, row: 0 },
  walk_2: { column: 0, row: 1 },
  walk_3: { column: 1, row: 1 },
});

/**
 * Mock `generateSheet` cell layout — aligned with **`sheetLayoutFromCrops`**.
 *
 * @type {Readonly<Record<string, { x: number; y: number }>>}
 */
export const CHARACTER_SHEET_LAYOUT = Object.freeze(sheetLayoutFromCrops(SHEET_CROPS, TILE_SIZE));

/**
 * Same **`recipeId`** string **`runPipeline`** writes to **`manifest.json`** for this preset.
 *
 * @param {'mock'|'generate'} mode
 * @param {'per-tile'|'sheet'} [strategy] Required when `mode === 'generate'`.
 */
export function recipeIdForCharacter(mode, strategy) {
  return buildRecipeId({
    preset: CHARACTER_PRESET_ID,
    mode,
    ...(mode === "generate" ? { strategy } : {}),
  });
}

/**
 * @typedef {object} CreateCharacterPresetOpts
 * @property {string} outBase Absolute output root (e.g. `.../public/art/character`).
 * @property {string} [artUrlPrefix='art/character'] Site-root-relative prefix for sprite-ref `images`.
 * @property {string} [pngFilename='character.png'] Basename in each frame folder.
 * @property {string} [spriteRefJsonRelativePath='sprite-ref.json'] Written under `outBase`.
 * @property {string} [provenanceTool='tools/sprite-generation/presets/character.mjs']
 * @property {number} [provenanceVersion=1]
 */

/**
 * Full **`PipelinePreset`** for the character walk workflow (pass to **`runPipeline`**).
 *
 * @param {CreateCharacterPresetOpts} opts
 */
export function createPreset(opts) {
  const outBase = opts?.outBase;
  if (typeof outBase !== "string" || !outBase.trim()) {
    throw new Error("createPreset(character): outBase (non-empty string, absolute output directory) is required");
  }

  const artUrlPrefix = opts.artUrlPrefix ?? "art/character";
  const pngFilename = opts.pngFilename ?? "character.png";
  const spriteRefJsonRelativePath = opts.spriteRefJsonRelativePath ?? "sprite-ref.json";
  const provenanceTool = opts.provenanceTool ?? "tools/sprite-generation/presets/character.mjs";
  const provenanceVersion = opts.provenanceVersion ?? 1;

  for (const f of CHARACTER_WALK_FRAMES) {
    if (!(f.id in SHEET_CROPS)) {
      throw new Error(`createPreset(character): SHEET_CROPS missing entry for frame id "${f.id}"`);
    }
  }

  return {
    presetId: CHARACTER_PRESET_ID,
    kind: CHARACTER_KIND,
    frames: CHARACTER_WALK_FRAMES,
    outBase,
    tileSize: TILE_SIZE,
    /** N×N falsprite grid for **`buildFalspriteStyleSpritePrompt`** / rewrite beat count. */
    sheetGridSize: 2,
    sheetOnlyOutput: true,
    frameSheetCells: { ...CHARACTER_FRAME_SHEET_CELLS },
    specsNaming: "sheet.png + sprite-ref.json (gridFrameKeys); no per-frame walk_* tiles",
    sheet: {
      width: SHEET_WIDTH,
      height: SHEET_HEIGHT,
      crops: { ...SHEET_CROPS },
      rows: 2,
      columns: 2,
      spriteWidth: TILE_SIZE,
      spriteHeight: TILE_SIZE,
    },
    prompt: {
      frameStyle: CHARACTER_WALK_FRAME_STYLE,
      frameComposition: CHARACTER_WALK_FRAME_COMPOSITION,
      sheetStyle: CHARACTER_WALK_SHEET_STYLE,
      sheetComposition: CHARACTER_WALK_SHEET_COMPOSITION,
      sheetSubject: CHARACTER_WALK_SHEET_SUBJECT,
      sheetRewriteUserPrompt: CHARACTER_WALK_SHEET_REWRITE_USER_SEED,
      sheetPromptBuilder: () => buildFalspriteStyleSpritePrompt(CHARACTER_WALK_SHEET_SUBJECT, 2),
      framePromptSuffix: CHARACTER_WALK_FRAME_PROMPT_SUFFIX,
    },
    fal: {
      defaultEndpoint: DEFAULT_FAL_ENDPOINT,
      falExtrasPerTile: { ...CHARACTER_FAL_EXTRAS_PER_TILE },
      falExtrasSheet: { ...CHARACTER_FAL_EXTRAS_SHEET },
      chromaAfterBria: false,
      chromaFringeEdgeDist: CHARACTER_CHROMA_FRINGE_EDGE_DIST,
      chromaSpillMaxDist: CHARACTER_CHROMA_SPILL_MAX_DIST,
      sheetRewrite: {
        enabled: true,
        systemPrompt: CHARACTER_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT,
      },
    },
    qa: { spriteWidth: QA_SPRITE_W, spriteHeight: QA_SPRITE_H },
    provenance: { tool: provenanceTool, version: provenanceVersion },
    generatorConfig: {
      tileBufferForFrame: (frame, ctx) => renderCharacterWalkMockTileBuffer(frame, ctx.tileSize),
      sheetLayout: CHARACTER_SHEET_LAYOUT,
    },
    postprocessSteps: [],
    spriteRef: {
      kind: "gridFrameKeys",
      jsonRelativePath: spriteRefJsonRelativePath,
      sheetImageRelativePath: `${artUrlPrefix.replace(/\/$/, "")}/sheet.png`,
    },
  };
}
