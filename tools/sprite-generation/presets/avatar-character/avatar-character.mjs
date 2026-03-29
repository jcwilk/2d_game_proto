/**
 * Character walk-cycle preset — **single source of truth** for frame list, sheet layout,
 * fal tuning, QA grid, and **`gridFrameKeys`** sprite-ref under `public/art/avatar-character/`.
 *
 * Contract matches **`presets/dpad/dpad.mjs`** (`PipelinePreset`, `runPipeline` from **`../../pipeline.mjs`**).
 * **`fal.sheetRewrite`** defaults to **on** for generate sheet (OpenRouter via **`FAL_KEY`**); override with **`tools/character-workflow.mjs --no-rewrite`**.
 *
 * **Transparency:** **BRIA** is the alpha path; **`fal.chromaAfterBria`** defaults to **off** (FalSprite-style BRIA-only; no per-tile chroma).
 *
 * **T2I:** Sheet jobs use **`fal-ai/nano-banana-2`** with **`CHARACTER_FAL_EXTRAS_SHEET`** (**1:1**, **`0.5K`**, **`expand_prompt`**, **`safety_tolerance`**) — cheaper tier. **`sheetNativeRaster`** is **on**: fal/BRIA output is **not** nearest-neighbor downscaled to **`SHEET_WIDTH`×`SHEET_HEIGHT`** before **`sheet.png`**; **`sprite-ref.json`** uses the derived cell size so the game draws at native texture resolution. Art direction: **illustrated / painterly 2D**, not pixel art (see **`CHARACTER_WALK_FRAME_STYLE`**). Prompt text follows **`buildFalspriteStyleSpritePrompt`** + **`CHARACTER_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT`** (see **`../../prompt.mjs`**).
 *
 * **Output:** **`sheetOnlyOutput`** — one **`sheet.png`** + **`sprite-ref.json`** (`gridFrameKeys`); no **`walk_*`** tile PNGs.
 *
 * **Frames (row-major 2×2):** **`walk_0`** is **idle standing** (top-left); **`walk_1`–`walk_3`** are walk phases. **`CHARACTER_FALSPRITE_SHEET_SUBJECT`** drives the falsprite T2I block.
 *
 * @see `../../README.md`
 * @see `../../pipeline.mjs`
 * @see `../../manifest.mjs` — `buildRecipeId`
 */

import {
  NANO_BANANA2_DEFAULT_RESOLUTION,
  NANO_BANANA2_LOW_RESOLUTION,
  NANO_BANANA2_SQUARE_ASPECT_RATIO,
} from "../../generators/fal.mjs";
import { renderCharacterWalkMockTileBuffer } from "../../generators/mock.mjs";
import { buildRecipeId } from "../../manifest.mjs";
import {
  buildFalspriteStyleSpritePrompt,
  CHARACTER_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT,
  CHARACTER_WALK_FRAME_COMPOSITION,
  CHARACTER_WALK_FRAME_PROMPT_SUFFIX,
  CHARACTER_WALK_SHEET_COMPOSITION,
  CHARACTER_WALK_SHEET_STYLE,
} from "../../prompt.mjs";
import { sheetLayoutFromCrops } from "../../sheet-layout.mjs";

/** Directory name under `presets/` — matches layout `presets/<ASSET_ID>/<ASSET_ID>.mjs`. */
export const ASSET_ID = "avatar-character";

/** Manifest `preset` field and `buildRecipeId` segment. */
export const MANIFEST_PRESET_ID = "character_walk";

/** @type {typeof MANIFEST_PRESET_ID} Stable alias — same string as {@link MANIFEST_PRESET_ID}. */
export const CHARACTER_PRESET_ID = MANIFEST_PRESET_ID;

/** Manifest `kind` for the walk sprite set. */
export const KIND = "character_walk_sprite";

/** Default CLI `--strategy` for registry / tooling. */
export const DEFAULT_STRATEGY = "sheet";

/** @type {typeof KIND} Stable alias — same string as {@link KIND}. */
export const CHARACTER_KIND = KIND;

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
 * Nano-banana sheet inputs: **1:1** + **0.5K** (fal per-image **0.75×** vs 1K base) + extras.
 */
export const CHARACTER_FAL_EXTRAS_SHEET = {
  aspect_ratio: NANO_BANANA2_SQUARE_ASPECT_RATIO,
  resolution: NANO_BANANA2_LOW_RESOLUTION,
  expand_prompt: true,
  safety_tolerance: 2,
};

/**
 * Per-tile prompt style line (placeholders: **`{tileSize}`**). **Illustrated game art** — not pixel art, not photoreal.
 * Defined here so art direction stays in this preset (not shared **`prompt.mjs`** defaults).
 */
export const CHARACTER_WALK_FRAME_STYLE =
  `Illustrated {tileSize}px square 2D side-view game character — painterly or soft cel-shaded full-color art, readable at small scale, not pixel art or blocky pixels, not photoreal, single frame. `;

export const CHARACTER_FAL_EXTRAS_PER_TILE = {
  aspect_ratio: "1:1",
  resolution: NANO_BANANA2_DEFAULT_RESOLUTION,
};

/**
 * Base line for **`buildFalspriteStyleSpritePrompt`** (CHARACTER AND ANIMATION DIRECTION). **First panel = idle.**
 * Kept in this preset so sheet semantics stay character-specific (not shared with `prompt.mjs` defaults).
 */
export const CHARACTER_FALSPRITE_SHEET_SUBJECT =
  `Illustrated full-color 2D game art (not pixel art). ` +
  `Panel order left to right, top row then bottom (2×2 grid): (1) idle standing — feet under hips, relaxed neutral pose, not mid-stride; ` +
  `(2) walk contact left; (3) walk passing / mid-stride; (4) walk contact right — one pose per cell, same character identity and outfit.`;

/** Short seed for OpenRouter (falsprite-style user message); not the full T2I block. */
export const CHARACTER_WALK_SHEET_REWRITE_USER_SEED =
  "Illustrated 2D side-view game character (painterly or cel-shaded, not pixel art): first beat is idle standing; then a three-step walk loop (contact left, passing, contact right) — single consistent identity and outfit.";

/** png-analyze cell size (4×4 grid on 64²). */
export const QA_SPRITE_W = 16;
export const QA_SPRITE_H = 16;

/**
 * Ordered frames: **idle** (sheet cell 1) then three walk phases. **Per-tile** prompts only matter for `--strategy per-tile`.
 *
 * @type {readonly import('../../generators/types.mjs').GeneratorFrame[]}
 */
export const CHARACTER_WALK_FRAMES = Object.freeze([
  {
    id: "walk_0",
    outSubdir: "walk_0",
    promptVariant:
      `Frame 1 of 4: idle standing — relaxed neutral pose, feet under body or slight comfortable stance, not walking, side-view or three-quarter — same character as other frames.`,
  },
  {
    id: "walk_1",
    outSubdir: "walk_1",
    promptVariant:
      `Frame 2 of 4: walk contact left — left foot forward / weight on right, right foot back — same character as other frames.`,
  },
  {
    id: "walk_2",
    outSubdir: "walk_2",
    promptVariant:
      `Frame 3 of 4: walk passing / mid-stride, both feet under body — same character as other frames.`,
  },
  {
    id: "walk_3",
    outSubdir: "walk_3",
    promptVariant:
      `Frame 4 of 4: walk contact right — right foot forward / weight on left, left foot back — same character as other frames.`,
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
export function recipeId(mode, strategy) {
  return buildRecipeId({
    preset: MANIFEST_PRESET_ID,
    mode,
    ...(mode === "generate" ? { strategy } : {}),
  });
}

/** @deprecated Prefer {@link recipeId}. */
export const recipeIdForCharacter = recipeId;

/**
 * @typedef {object} CreateCharacterPresetOpts
 * @property {string} outBase Absolute output root (e.g. `.../public/art/avatar-character`).
 * @property {string} [artUrlPrefix='art/avatar-character'] Site-root-relative prefix for sprite-ref `images`.
 * @property {string} [pngFilename='character.png'] Basename in each frame folder.
 * @property {string} [spriteRefJsonRelativePath='sprite-ref.json'] Written under `outBase`.
 * @property {string} [provenanceTool='tools/sprite-generation/presets/avatar-character/avatar-character.mjs']
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
    throw new Error("createPreset(avatar-character): outBase (non-empty string, absolute output directory) is required");
  }

  const artUrlPrefix = opts.artUrlPrefix ?? "art/avatar-character";
  const pngFilename = opts.pngFilename ?? "character.png";
  const spriteRefJsonRelativePath = opts.spriteRefJsonRelativePath ?? "sprite-ref.json";
  const provenanceTool = opts.provenanceTool ?? "tools/sprite-generation/presets/avatar-character/avatar-character.mjs";
  const provenanceVersion = opts.provenanceVersion ?? 1;

  for (const f of CHARACTER_WALK_FRAMES) {
    if (!(f.id in SHEET_CROPS)) {
      throw new Error(`createPreset(avatar-character): SHEET_CROPS missing entry for frame id "${f.id}"`);
    }
  }

  return {
    presetId: MANIFEST_PRESET_ID,
    kind: KIND,
    frames: CHARACTER_WALK_FRAMES,
    outBase,
    tileSize: TILE_SIZE,
    /** N×N falsprite grid for **`buildFalspriteStyleSpritePrompt`** / rewrite beat count. */
    sheetGridSize: 2,
    sheetOnlyOutput: true,
    /** Keep T2I/BRIA pixel dimensions; manifest + sprite-ref grid match the saved **`sheet.png`**. */
    sheetNativeRaster: true,
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
      sheetSubject: CHARACTER_FALSPRITE_SHEET_SUBJECT,
      sheetRewriteUserPrompt: CHARACTER_WALK_SHEET_REWRITE_USER_SEED,
      sheetPromptBuilder: (ctx) =>
        buildFalspriteStyleSpritePrompt(ctx.rewrittenBase ?? CHARACTER_FALSPRITE_SHEET_SUBJECT, 2),
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
