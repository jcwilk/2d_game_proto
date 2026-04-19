/**
 * D-pad four-way tile preset — **single source of truth** for frame list, sheet layout,
 * fal tuning, QA grid size, and **`gridFrameKeys`** sprite-ref under `public/`.
 *
 * ## Preset contract (`runPipeline` from **`../../pipeline.mjs`**)
 *
 * **`createPreset(opts)`** returns an object matching **`PipelinePreset`**:
 *
 * - **`presetId`** / **`kind`** — Manifest `preset` and `kind`.
 * - **`frames`** — `GeneratorFrame[]` with `id`, `outSubdir`, `promptVariant`.
 * - **`outBase`** — Absolute directory for tiles, `manifest.json`, `sprite-ref.json`.
 * - **`tileSize`** — Square tile edge (px).
 * - **`sheet`** — `{ width, height, crops, rows, columns, spriteWidth, spriteHeight }` — 2×2 grid.
 * - **`prompt`** — falsprite-style HUD sheet via **`buildDpadGridSpritePrompt`** + **`sheetPromptBuilder`**.
 * - **`fal`** — **`fal-ai/nano-banana-2`** with **1:1** + **0.5K** sheet extras (see **`DPAD_FAL_EXTRAS_SHEET`**).
 * - **`qa`** — png-analyze cell size.
 * - **`spriteRef`** — **`kind: 'gridFrameKeys'`** — one **`sheet.png`** + frame→cell map.
 *
 * **Transparency:** **BRIA** sheet matting; **`postprocessSteps`** **`[]`** (no per-tile chroma). **`sheetOnlyOutput`** — no per-frame PNGs.
 *
 * ## Art direction (HUD triangles)
 *
 * Default look: **subtle rough stone** — matte, lightly granular fill, soft weathered edges, not glossy
 * (see **`DPAD_SHEET_MATERIAL_GUIDANCE`** and per-tile **`DPAD_TILE_MATERIAL_HINT`**). The sheet T2I block
 * and OpenRouter rewrite system prompt are aligned so **`--rewrite`** stays on-brand.
 *
 * @see `../../README.md`
 * @see `../../pipeline.mjs`
 * @see `../../manifest.ts` — `buildRecipeId`
 */

import {
  NANO_BANANA2_DEFAULT_RESOLUTION,
  NANO_BANANA2_LOW_RESOLUTION,
  NANO_BANANA2_SQUARE_ASPECT_RATIO,
} from "../../generators/fal.ts";
import { defaultDpadShapeForFrame } from "../../generators/mock.ts";
import { buildRecipeId } from "../../manifest.ts";
import {
  buildDpadGridSpritePrompt,
  DPAD_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT,
  DPAD_FALSPRITE_SHEET_SUBJECT,
  DPAD_FRAME_COMPOSITION,
  DPAD_FRAME_PROMPT_SUFFIX,
  DPAD_FRAME_STYLE,
} from "../../prompt.ts";
import { sheetLayoutFromCrops } from "../../sheet-layout.ts";

/** Directory name under `presets/` — matches layout `presets/<ASSET_ID>/<ASSET_ID>.mjs`. */
export const ASSET_ID = "dpad";

/** Manifest `preset` field and `buildRecipeId` segment. */
export const MANIFEST_PRESET_ID = "dpad_four_way";

/** @type {typeof MANIFEST_PRESET_ID} Stable alias — same string as {@link MANIFEST_PRESET_ID}. */
export const DPAD_PRESET_ID = MANIFEST_PRESET_ID;

/** Manifest `kind` for the four-way HUD tile set. */
export const KIND = "dpad_tile_set";

/** Default CLI `--strategy` for registry / tooling. */
export const DEFAULT_STRATEGY = "sheet";

/** @type {typeof KIND} Stable alias — same string as {@link KIND}. */
export const DPAD_KIND = KIND;

/** Tile pixel size (width = height) for each d-pad direction cell (nominal; native fal/BRIA may differ when `sheetNativeRaster`). */
export const TILE_SIZE = 100;

/**
 * Single fal/mock sheet: **2×2** grid (four **`TILE_SIZE`** squares). Must match **`SHEET_CROPS`**.
 */
export const SHEET_WIDTH = TILE_SIZE * 2;
export const SHEET_HEIGHT = TILE_SIZE * 2;

/** fal default; callers may override via `runPipeline` opts / CLI `--endpoint`. */
export const DEFAULT_FAL_ENDPOINT = "fal-ai/nano-banana-2";

/**
 * Nano-banana sheet inputs: **1:1** + **0.5K** (aligned with character walk preset).
 */
export const DPAD_FAL_EXTRAS_SHEET = {
  aspect_ratio: NANO_BANANA2_SQUARE_ASPECT_RATIO,
  resolution: NANO_BANANA2_LOW_RESOLUTION,
  expand_prompt: true,
  safety_tolerance: 2,
};

/**
 * Extra fal input for **per-tile** nano-banana jobs (square tiles).
 */
export const DPAD_FAL_EXTRAS_PER_TILE = {
  aspect_ratio: "1:1",
  resolution: NANO_BANANA2_DEFAULT_RESOLUTION,
};

/** Grid cell size for png-analyze (5×5 cells on 100²). */
export const QA_SPRITE_W = 20;
export const QA_SPRITE_H = 20;

/**
 * Sheet T2I / `HUD GLYPH AND DIRECTION` — appended to {@link DPAD_FALSPRITE_SHEET_SUBJECT} for the default
 * prompt (and unless OpenRouter returns a full replacement `rewrittenBase`).
 */
export const DPAD_SHEET_MATERIAL_GUIDANCE =
  "Material for the triangle glyphs: subtle rough stone — matte, lightly granular micro-texture, soft weathered edges, " +
  "not glossy, not harsh noise; keep silhouettes crisp and readable at small UI size.";

/**
 * Shared fragment for **`--strategy per-tile`** prompts so tile jobs match sheet art direction.
 */
export const DPAD_TILE_MATERIAL_HINT =
  "Triangle fill: subtle rough stone (matte, lightly granular), readable at small size.";

/**
 * D-pad preset: ordered frames (up → down → left → right in list; 2×2 row-major sheet cells).
 *
 * @type {readonly import('../../generators/types.ts').GeneratorFrame[]}
 */
export const DPAD_FRAMES = Object.freeze([
  {
    id: "up",
    outSubdir: "up",
    promptVariant:
      `Orientation NORTH (up): one isosceles triangle only, pointing straight up. ` +
      `Apex sits on the top edge at horizontal center; the base is a horizontal segment below the apex, parallel to the bottom edge. ` +
      `One clear triangle; subtle shading or bevel for material read OK — no extruded 3D blocks, no chevron pair. ` +
      DPAD_TILE_MATERIAL_HINT,
  },
  {
    id: "down",
    outSubdir: "down",
    promptVariant:
      `Orientation SOUTH (down): one isosceles triangle only, pointing straight down. ` +
      `Apex sits on the bottom edge at horizontal center; the base is a horizontal segment above the apex. ` +
      `One clear triangle; subtle shading or bevel for material read OK — no extruded 3D blocks, no chevron pair. ` +
      DPAD_TILE_MATERIAL_HINT,
  },
  {
    id: "left",
    outSubdir: "left",
    promptVariant:
      `Orientation WEST (left): one isosceles triangle only, pointing straight left toward the left edge. ` +
      `The tip touches the left edge at vertical midline; the base is a vertical segment on the right half of the tile. ` +
      `The triangle must be wider than tall (landscape), not a tall vertical sliver. ` +
      `Do not draw an upward or downward arrow; this is a horizontal-left control glyph. ` +
      `One clear triangle; subtle shading or bevel OK — no extruded 3D blocks. ` +
      DPAD_TILE_MATERIAL_HINT,
  },
  {
    id: "right",
    outSubdir: "right",
    promptVariant:
      `Orientation EAST (right): one isosceles triangle only, pointing straight right toward the right edge. ` +
      `The tip touches the right edge at vertical midline; the base is a vertical segment on the left half of the tile. ` +
      `The triangle must be wider than tall (landscape), not a tall vertical sliver. ` +
      `Do not draw an upward, downward, or leftward arrow. ` +
      `One clear triangle; subtle shading or bevel OK — no extruded 3D blocks. ` +
      DPAD_TILE_MATERIAL_HINT,
  },
]);

/**
 * Top-left origins in the 200×200 sheet (row-major: up, down / left, right).
 *
 * @type {Readonly<Record<string, { x: number; y: number }>>}
 */
export const SHEET_CROPS = Object.freeze({
  up: { x: 0, y: 0 },
  down: { x: TILE_SIZE, y: 0 },
  left: { x: 0, y: TILE_SIZE },
  right: { x: TILE_SIZE, y: TILE_SIZE },
});

/**
 * Logical frame → grid cell (**column**, **row**) for **`sprite-ref.json`** (`gridFrameKeys`).
 *
 * @type {Readonly<Record<string, { column: number; row: number }>>}
 */
export const DPAD_FRAME_SHEET_CELLS = Object.freeze({
  up: { column: 0, row: 0 },
  down: { column: 1, row: 0 },
  left: { column: 0, row: 1 },
  right: { column: 1, row: 1 },
});

/**
 * Mock `generateSheet` cell layout — **not** independent of **`SHEET_CROPS`**; same mapping as
 * **`sheetLayoutFromCrops`** in **`../../sheet-layout.ts`** so compositor placement matches crop extraction.
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
export function recipeId(mode, strategy) {
  return buildRecipeId({
    preset: MANIFEST_PRESET_ID,
    mode,
    ...(mode === "generate" ? { strategy } : {}),
  });
}

/** @deprecated Prefer {@link recipeId}. */
export const recipeIdForDpad = recipeId;

/**
 * @typedef {object} CreateDpadPresetOpts
 * @property {string} outBase Absolute output root (e.g. `.../public/art/dpad`).
 * @property {string} [artUrlPrefix='art/dpad'] Site-root-relative prefix for sprite-ref `image` (no `public/`, no leading slash).
 * @property {string} [spriteRefJsonRelativePath='sprite-ref.json'] Written under `outBase`.
 * @property {string} [provenanceTool='tools/sprite-generation/presets/dpad/dpad.mjs']
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
  const spriteRefJsonRelativePath = opts.spriteRefJsonRelativePath ?? "sprite-ref.json";
  const provenanceTool = opts.provenanceTool ?? "tools/sprite-generation/presets/dpad/dpad.mjs";
  const provenanceVersion = opts.provenanceVersion ?? 1;

  for (const f of DPAD_FRAMES) {
    if (!(f.id in SHEET_CROPS)) {
      throw new Error(`createPreset(dpad): SHEET_CROPS missing entry for frame id "${f.id}"`);
    }
  }

  return {
    presetId: MANIFEST_PRESET_ID,
    kind: KIND,
    frames: DPAD_FRAMES,
    outBase,
    tileSize: TILE_SIZE,
    sheetGridSize: 2,
    sheetOnlyOutput: true,
    sheetNativeRaster: true,
    frameSheetCells: { ...DPAD_FRAME_SHEET_CELLS },
    specsNaming: "sheet.png + sprite-ref.json (gridFrameKeys); no per-frame dpad.png",
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
      frameStyle: DPAD_FRAME_STYLE,
      frameComposition: DPAD_FRAME_COMPOSITION,
      sheetSubject: `${DPAD_FALSPRITE_SHEET_SUBJECT} ${DPAD_SHEET_MATERIAL_GUIDANCE}`,
      sheetPromptBuilder: (ctx) =>
        buildDpadGridSpritePrompt(
          ctx.rewrittenBase ?? `${DPAD_FALSPRITE_SHEET_SUBJECT} ${DPAD_SHEET_MATERIAL_GUIDANCE}`,
          2,
        ),
      framePromptSuffix: DPAD_FRAME_PROMPT_SUFFIX,
    },
    fal: {
      defaultEndpoint: DEFAULT_FAL_ENDPOINT,
      falExtrasPerTile: { ...DPAD_FAL_EXTRAS_PER_TILE },
      falExtrasSheet: { ...DPAD_FAL_EXTRAS_SHEET },
      chromaAfterBria: false,
      sheetRewrite: {
        enabled: true,
        systemPrompt: DPAD_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT,
      },
    },
    qa: { spriteWidth: QA_SPRITE_W, spriteHeight: QA_SPRITE_H },
    provenance: { tool: provenanceTool, version: provenanceVersion },
    generatorConfig: {
      shapeForFrame: defaultDpadShapeForFrame,
      sheetLayout: DPAD_SHEET_LAYOUT,
    },
    postprocessSteps: [],
    spriteRef: {
      kind: "gridFrameKeys",
      jsonRelativePath: spriteRefJsonRelativePath,
      sheetImageRelativePath: `${artUrlPrefix.replace(/\/$/, "")}/sheet.png`,
    },
  };
}
