/**
 * Character walk-cycle preset — **single source of truth** for frame list, sheet layout,
 * fal tuning, QA grid, and **`gridFrameKeys`** sprite-ref under `public/art/avatar-character/`.
 *
 * Contract matches **`presets/dpad/dpad.ts`** (`PipelinePreset`, `runPipeline` from **`../../pipeline.ts`**).
 * **`fal.sheetRewrite`** defaults to **on** for generate sheet (OpenRouter via **`FAL_KEY`**); **`npm run generate:spritesheet -- run --asset avatar-character --mode live`** uses preset defaults. Override rewrite via **`fal.sheetRewrite`** on the object passed to **`runPipeline`** (see **`../../pipeline.ts`**).
 *
 * **Transparency:** **BRIA** is the alpha path; **`fal.chromaAfterBria`** defaults to **off** (FalSprite-style BRIA-only; no per-tile chroma).
 *
 * **T2I:** Sheet jobs use **`fal-ai/nano-banana-2`** with **`defaultCharacterFalPipelinePartial().falExtrasSheet`** (**`3:2`** fal enum — closest to game **8:5** strip; each cell **2:5** (**W** wide × **2.5W** tall), **`0.5K`**, **`expand_prompt`**, **`safety_tolerance`**) — cheaper tier. **`sheet.png`** is stored at **native** fal/BRIA dimensions (no pipeline resize); **`sprite-ref.json`** uses the derived cell size. Art direction: **illustrated / painterly 2D**; the engine scales with smooth filtering. Sheet T2I uses **`buildCharacterWalkStripSpritePrompt`** (`../../prompt.ts`) and extended **`CHARACTER_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT`** (isometric staging).
 *
 * **Output:** **`sheetOnlyOutput`** — one **`sheet.png`** + **`sprite-ref.json`** (`gridFrameKeys`); no **`walk_*`** tile PNGs.
 *
 * **Frames (1×4 row, left to right):** **`walk_0`** is **idle standing**; **`walk_1`–`walk_3`** are walk phases. **`CHARACTER_FALSPRITE_SHEET_SUBJECT`** drives the falsprite T2I block.
 *
 * @see `../../README.md`
 * @see `../../pipeline.ts`
 * @see `../../manifest.ts` — `buildRecipeId`
 */

import type { GeneratorFrame } from "../../generators/types.ts";
import { renderCharacterWalkMockTileBuffer } from "../../generators/mock.ts";
import { buildRecipeId } from "../../manifest.ts";
import type { PipelinePreset } from "../../pipeline.ts";
import type { CreatePresetOptsBase } from "../../preset-contract.ts";
import {
  buildCharacterWalkStripSpritePrompt,
  CHARACTER_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT as CHARACTER_WALK_REWRITE_SYSTEM_BASE,
  CHARACTER_WALK_FRAME_COMPOSITION,
  CHARACTER_WALK_FRAME_PROMPT_SUFFIX,
  CHARACTER_WALK_SHEET_COMPOSITION,
  CHARACTER_WALK_SHEET_STYLE,
} from "../../prompt.ts";
import {
  CHARACTER_WALK_FRAME_HEIGHT_PX,
  CHARACTER_WALK_FRAME_PX,
  CHROMA_TOLERANCE_DEFAULT,
  CHARACTER_CHROMA_FRINGE_EDGE_DIST,
  CHARACTER_CHROMA_SPILL_MAX_DIST,
  DEFAULT_CHARACTER_FAL_ENDPOINT,
  defaultCharacterFalPipelinePartial,
} from "../lib/character-defaults.ts";
import { createCharacterStripPreset } from "../lib/character-preset.ts";
import {
  frameSheetCellsRowMajor,
  horizontalStripCrops,
  sheetDimensionsFromStrip,
  sheetLayoutFromStripCrops,
} from "../lib/sheet-spec.ts";

/** Directory name under `presets/` — matches layout `presets/<ASSET_ID>/<ASSET_ID>.ts`. */
export const ASSET_ID = "avatar-character";

/** Manifest `preset` field and `buildRecipeId` segment. */
export const MANIFEST_PRESET_ID = "character_walk";

/** Stable alias — same string as {@link MANIFEST_PRESET_ID}. */
export const CHARACTER_PRESET_ID = MANIFEST_PRESET_ID;

/** Manifest `kind` for the walk sprite set. */
export const KIND = "character_walk_sprite";

/** Default CLI `--strategy` for registry / tooling. */
export const DEFAULT_STRATEGY = "sheet";

/** Stable alias — same string as {@link KIND}. */
export const CHARACTER_KIND = KIND;

/**
 * Walk-frame **width** (px) — matches floor tile / footprint width; with {@link TILE_HEIGHT} the cell is **width:height = 2:5**.
 * See **`CHARACTER_WALK_FRAME_WIDTH_PX`** / **`CHARACTER_WALK_FRAME_HEIGHT_PX`** in **`src/dimensions.ts`** (via **`character-defaults.ts`** / **`gameDimensions.ts`**).
 */
export const TILE_SIZE = CHARACTER_WALK_FRAME_PX;

/** Walk-frame height (px) — **2.5×** {@link TILE_SIZE} (**2:5** with width). */
export const TILE_HEIGHT = CHARACTER_WALK_FRAME_HEIGHT_PX;

/**
 * Default Euclidean RGB distance for the main chroma pass (per-tile strategy only). Higher keys more near-magenta pixels but can eat
 * costume pinks/purples; override **`chromaTolerance`** in **`runPipeline`** options or change **`CHROMA_TOLERANCE_DEFAULT`** in **`character-defaults.ts`**.
 */
export { CHROMA_TOLERANCE_DEFAULT };

/**
 * Looser Euclidean distance **only** on pixels that border transparency (after main chroma). Keep this
 * moderately above **`CHROMA_TOLERANCE_DEFAULT`**; too high keys pinks/purples in the figure.
 */
export { CHARACTER_CHROMA_FRINGE_EDGE_DIST };

/**
 * After silhouette peel: remove **semi-transparent** pixels (BRIA edge halos) within this Euclidean
 * distance of the key. Opaque pixels are untouched. **`0`** disables (via CLI / **`runPipeline`**).
 */
export { CHARACTER_CHROMA_SPILL_MAX_DIST };

/**
 * Ordered frames: **idle** (sheet cell 1) then three walk phases. **Per-tile** prompts only matter for `--strategy per-tile`.
 */
export const CHARACTER_WALK_FRAMES: readonly GeneratorFrame[] = Object.freeze([
  {
    id: "walk_0",
    outSubdir: "walk_0",
    promptVariant:
      `Frame 1 of 4: idle standing — relaxed neutral pose, feet under body or slight comfortable stance, not walking, isometric three-quarter view — same character as other frames.`,
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

const _frameIds = CHARACTER_WALK_FRAMES.map((f) => f.id);

/** Single sheet: **1×4** horizontal strip (four walk frames). Derived via **`horizontalStripCrops`**. */
export const SHEET_CROPS = horizontalStripCrops(_frameIds, TILE_SIZE, TILE_HEIGHT);

const _stripDims = sheetDimensionsFromStrip(_frameIds.length, TILE_SIZE, TILE_HEIGHT);
export const SHEET_WIDTH = _stripDims.sheetWidth;
export const SHEET_HEIGHT = _stripDims.sheetHeight;

/**
 * Logical frame → grid cell (**column**, **row**) for **`sprite-ref.json`** (`gridFrameKeys`).
 */
export const CHARACTER_FRAME_SHEET_CELLS = frameSheetCellsRowMajor(_frameIds, _frameIds.length);

/**
 * Mock `generateSheet` cell layout — aligned with **`sheetLayoutFromStripCrops`**.
 */
export const CHARACTER_SHEET_LAYOUT = sheetLayoutFromStripCrops(SHEET_CROPS, TILE_SIZE, TILE_HEIGHT);

/** fal default; callers may override via `runPipeline` opts / CLI `--endpoint`. */
export const DEFAULT_FAL_ENDPOINT = DEFAULT_CHARACTER_FAL_ENDPOINT;

/**
 * Per-tile prompt style line (placeholders: **`{tileSize}`**). **Illustrated game art** — not pixel art, not photoreal.
 * Defined here so art direction stays in this preset (not shared **`prompt.ts`** defaults).
 */
export const CHARACTER_WALK_FRAME_STYLE =
  `Illustrated ${TILE_SIZE}×${TILE_HEIGHT}px rectangular 2D game character in **isometric three-quarter view** — painterly or soft cel-shaded full-color art, readable at small scale, not pixel art or blocky pixels, not photoreal, not flat side-profile only, single frame. `;

/**
 * Base line for **`buildFalspriteStyleSpritePrompt`** (CHARACTER AND ANIMATION DIRECTION). **First panel = idle.**
 * Kept in this preset so sheet semantics stay character-specific (not shared with `prompt.ts` defaults).
 */
export const CHARACTER_FALSPRITE_SHEET_SUBJECT =
  `Illustrated full-color 2D game art (not pixel art), **isometric three-quarter view** with the same per-cell framing everywhere: figure centered on the vertical midline; **top of head 10%** down from top; **soles / ground contact 20%** above bottom (**W/4** clearance, same as mock); head/torso/leg proportions **~10/64**, **12/64**, **5/64** vs cell. ` +
  `Panel order **left to right** in a **single row** (1×4 strip): (1) idle standing — feet under hips, relaxed neutral pose, not mid-stride; ` +
  `(2) walk contact left; (3) walk passing / mid-stride; (4) walk contact right — one pose per cell, same character identity and outfit.`;

/** Short seed for OpenRouter (falsprite-style user message); not the full T2I block. */
export const CHARACTER_WALK_SHEET_REWRITE_USER_SEED =
  "Illustrated 2D game character in isometric three-quarter view (painterly or cel-shaded, not pixel art): centered in frame; head top **10%** from top edge, feet ground line **20%** from bottom (mock pipeline / W/4 clearance); compact proportions like the reference mock; first beat is idle standing; then a three-step walk loop (contact left, passing, contact right) — single consistent identity and outfit.";

/** OpenRouter system prompt: base falsprite four-beat rules plus isometric 3/4 staging (output must still avoid digits per base rules). */
export const CHARACTER_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT =
  CHARACTER_WALK_REWRITE_SYSTEM_BASE +
  " Staging: describe the character and motion as seen from a fixed isometric three-quarter camera (oblique, front plus one side readable — not a flat side profile). The performer should occupy the frame as if centered on the vertical midline: **top of head** near **10%** down from the top, **ground contact** near **20%** up from the bottom (same vertical bands as the pipeline mock, not equal 10% top and bottom)." +
  " Backdrop (match isometric floor strip rewrites): do **not** mention chroma keys, greenscreen, matting, or bright magenta/fuchsia as the background — one calm uniform flat backdrop only; **no** gutters, divider lines, or vertical bands between columns; **no** pink/purple glow or colored halos at the figure outline or along interior vertical boundaries.";

/** png-analyze cell size (~¼ of frame width × height on each walk frame). */
export const QA_SPRITE_W = Math.max(16, Math.round(TILE_SIZE / 4));
export const QA_SPRITE_H = Math.max(8, Math.round(TILE_HEIGHT / 4));

/**
 * Same **`recipeId`** string **`runPipeline`** writes to **`manifest.json`** for this preset.
 */
export function recipeId(mode: "mock" | "generate", strategy?: "per-tile" | "sheet"): string {
  return buildRecipeId({
    preset: MANIFEST_PRESET_ID,
    mode,
    ...(mode === "generate" ? { strategy } : {}),
  });
}

/** @deprecated Prefer {@link recipeId}. */
export const recipeIdForCharacter = recipeId;

export interface CreateCharacterPresetOpts extends CreatePresetOptsBase {
  /** Basename in each frame folder. */
  pngFilename?: string;
}

/**
 * Full **`PipelinePreset`** for the character walk workflow (pass to **`runPipeline`**).
 */
export function createPreset(opts: CreateCharacterPresetOpts): PipelinePreset {
  if (typeof opts?.outBase !== "string" || !opts.outBase.trim()) {
    throw new Error("createPreset(avatar-character): outBase (non-empty string, absolute output directory) is required");
  }

  const artUrlPrefix = opts.artUrlPrefix ?? "art/avatar-character";
  const spriteRefJsonRelativePath = opts.spriteRefJsonRelativePath ?? "sprite-ref.json";
  const provenanceTool = opts.provenanceTool ?? "tools/sprite-generation/presets/avatar-character/avatar-character.ts";
  const provenanceVersion = opts.provenanceVersion ?? 1;

  const falBase = defaultCharacterFalPipelinePartial();

  return createCharacterStripPreset({
    outBase: opts.outBase,
    presetId: MANIFEST_PRESET_ID,
    kind: KIND,
    frames: CHARACTER_WALK_FRAMES,
    prompt: {
      frameStyle: CHARACTER_WALK_FRAME_STYLE,
      frameComposition: CHARACTER_WALK_FRAME_COMPOSITION,
      sheetStyle: CHARACTER_WALK_SHEET_STYLE,
      sheetComposition: CHARACTER_WALK_SHEET_COMPOSITION,
      sheetSubject: CHARACTER_FALSPRITE_SHEET_SUBJECT,
      sheetRewriteUserPrompt: CHARACTER_WALK_SHEET_REWRITE_USER_SEED,
      sheetPromptBuilder: (ctx) =>
        buildCharacterWalkStripSpritePrompt(
          ctx.rewrittenBase ?? CHARACTER_FALSPRITE_SHEET_SUBJECT,
          ctx.sheetWidth,
          ctx.sheetHeight,
        ),
      framePromptSuffix: CHARACTER_WALK_FRAME_PROMPT_SUFFIX,
    },
    renderMockTileBuffer: (frame, ctx) =>
      renderCharacterWalkMockTileBuffer(
        frame,
        ctx.tileWidth ?? TILE_SIZE,
        ctx.tileHeight ?? TILE_HEIGHT,
      ),
    spriteRef: {
      kind: "gridFrameKeys",
      jsonRelativePath: spriteRefJsonRelativePath,
      sheetImageRelativePath: `${artUrlPrefix.replace(/\/$/, "")}/sheet.png`,
    },
    specsNaming: "sheet.png + sprite-ref.json (gridFrameKeys); no per-frame walk_* tiles",
    provenanceTool,
    provenanceVersion,
    fal: {
      ...falBase,
      sheetRewrite: {
        enabled: true,
        systemPrompt: CHARACTER_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT,
      },
    },
  });
}
