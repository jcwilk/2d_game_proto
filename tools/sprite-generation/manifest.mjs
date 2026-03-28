/**
 * Manifest builder for sprite-generation outputs (`manifest.json`).
 *
 * Assembles the same structural shape as **`public/art/dpad/manifest.json`**:
 * `kind`, `preset`, `recipeId`, `createdAt`, `workflow`, `specs`, `generationRecipe`,
 * `frames[]`, `provenance`, and initial `generationResults`.
 *
 * ## `recipeId` versioning
 *
 * Stable string that **must change** when generation semantics change: pipeline behavior,
 * preset recipe, strategy (per-tile vs sheet), or postprocess/generator contract.
 *
 * **Naming scheme:** `sprite-gen-{presetId}-{segment}-{versionSlug}`
 *
 * - **presetId** — snake_case preset identifier (e.g. `dpad_four_way`), matching `preset` in JSON.
 * - **segment** — `mock` for `--mode mock`, else `per-tile` or `sheet` for `--strategy`.
 * - **versionSlug** — bump only when the contract above changes; see **`RECIPE_VERSION`**.
 *
 * Prefix **`sprite-gen-`** scopes ids to this library (replacing ad-hoc `dpad-workflow-*` ids).
 */

/** Bump a slug when mock path semantics (frames list, mock generator contract) change. */
export const RECIPE_VERSION_MOCK = "v2-frames";

/** Bump when per-tile fal + chroma postprocess contract changes (plain txt2img, no control image). */
export const RECIPE_VERSION_PER_TILE = "v5-corner-chroma";

/** Per-tile generate with **FLUX Control LoRA Canny** + mock-triangle control mask (`control-image.mjs`). */
export const RECIPE_VERSION_PER_TILE_CONTROL = "v6-control-canny";

/** Bump when sheet fal + crop + chroma contract changes (plain flux/dev sheet, no control image). */
export const RECIPE_VERSION_SHEET = "v13-frames-chroma";

/** Sheet generate with **FLUX Control LoRA Canny** + composite mock triangle mask (e.g. dpad 1×4). */
export const RECIPE_VERSION_SHEET_CONTROL = "v14-1x4-control-chroma";

/**
 * @param {{ preset: string; mode: 'mock' | 'generate'; strategy?: 'per-tile' | 'sheet'; controlCanny?: boolean }} ctx
 * @returns {string}
 */
export function buildRecipeId(ctx) {
  const { preset, mode } = ctx;
  const base = `sprite-gen-${preset}`;
  if (mode === "mock") {
    return `${base}-mock-${RECIPE_VERSION_MOCK}`;
  }
  const strategy = ctx.strategy;
  if (mode === "generate" && strategy === "sheet") {
    const useControl = ctx.controlCanny !== false;
    const ver = useControl ? RECIPE_VERSION_SHEET_CONTROL : RECIPE_VERSION_SHEET;
    return `${base}-sheet-${ver}`;
  }
  if (mode === "generate" && strategy === "per-tile") {
    const useControl = ctx.controlCanny !== false;
    const ver = useControl ? RECIPE_VERSION_PER_TILE_CONTROL : RECIPE_VERSION_PER_TILE;
    return `${base}-per-tile-${ver}`;
  }
  throw new Error(`buildRecipeId: need strategy when mode is generate (got ${String(strategy)})`);
}

/**
 * @param {{ mode: 'mock' | 'generate'; strategy?: 'per-tile' | 'sheet'; endpoint: string | null; sheetWidth: number; sheetHeight: number; controlCanny?: boolean }} p
 */
function buildWorkflowLabel(p) {
  if (p.mode === "mock") return "mock (triangles)";
  if (p.mode === "generate" && p.strategy === "sheet") {
    const tag = p.controlCanny ? "control-canny + mock mask" : "txt2img";
    return `fal sheet (${p.endpoint}, ${p.sheetWidth}×${p.sheetHeight}px, ${tag} → crop)`;
  }
  if (p.mode === "generate" && p.strategy === "per-tile") {
    if (p.controlCanny) {
      return `fal per-tile control-canny (${p.endpoint}) + mock triangle mask`;
    }
    return `fal per-tile (${p.endpoint})`;
  }
  return "mock (triangles)";
}

/**
 * @param {{
 *   mode: 'mock' | 'generate';
 *   strategy?: 'per-tile' | 'sheet';
 *   chromaKeyHex: string;
 *   tileSize: number;
 *   sheetWidth: number;
 *   sheetHeight: number;
 * }} p
 */
function buildRecipeNote(p) {
  if (p.mode === "mock") {
    return "Mock: geometry from pngjs triangles, not T2I.";
  }
  if (p.mode === "generate" && p.strategy === "sheet") {
    return `Real: one fal job at ${p.sheetWidth}x${p.sheetHeight}, crop to ${p.tileSize}px, then chroma-key (${p.chromaKeyHex}) → RGBA.`;
  }
  return (
    `Real: one fal.subscribe per frame with identical prompt template + PER_TILE_FAL_EXTRA_INPUT; ` +
    `same integer --seed for every call in the batch when set; chroma-key (${p.chromaKeyHex}) → RGBA after each download.`
  );
}

/**
 * Initial manifest before per-frame results (empty `frames` / `generationResults` content except structure).
 *
 * @param {{
 *   kind: string;
 *   preset: string;
 *   recipeId: string;
 *   createdAt: string;
 *   frames: Array<{ id: string; outSubdir: string }>;
 *   mode: 'mock' | 'generate';
 *   strategy?: 'per-tile' | 'sheet';
 *   controlCanny?: boolean
 *   endpoint: string | null;
 *   imageSize: string;
 *   tileSize: number;
 *   sheetSize?: number;
 *   sheetWidth?: number;
 *   sheetHeight?: number;
 *   sheetCropMap?: Record<string, { x: number; y: number }>;
 *   chromaKeyHex: string;
 *   chromaTolerance: number;
 *   keyRgbForManifest: { r: number; g: number; b: number } | null;
 *   falExtrasPerTile: Record<string, unknown> | null;
 *   falExtrasSheet: Record<string, unknown> | null;
 *   seed?: number | null;
 *   provenance: { tool: string; version: number };
 *   pngBasename: string;
 *   specsNaming?: string | null;
 * }} input
 * @returns {Record<string, unknown>}
 */
export function buildInitialManifest(input) {
  const {
    kind,
    preset,
    recipeId,
    createdAt,
    frames,
    mode,
    strategy,
    controlCanny = false,
    endpoint,
    imageSize,
    tileSize,
    sheetSize = tileSize * 2,
    sheetWidth,
    sheetHeight,
    sheetCropMap,
    chromaKeyHex,
    chromaTolerance,
    keyRgbForManifest,
    falExtrasPerTile,
    falExtrasSheet,
    seed = null,
    provenance,
    pngBasename,
    specsNaming = null,
  } = input;

  const sheetW = sheetWidth ?? sheetSize;
  const sheetH = sheetHeight ?? sheetSize;

  const workflow = buildWorkflowLabel({
    mode,
    strategy,
    endpoint,
    sheetWidth: sheetW,
    sheetHeight: sheetH,
    controlCanny,
  });

  const recipeNote = buildRecipeNote({ mode, strategy, chromaKeyHex, tileSize, sheetWidth: sheetW, sheetHeight: sheetH });

  /** @type {Record<string, unknown>} */
  const specs = {
    tileSize: { width: tileSize, height: tileSize },
    framePreset: frames.map((f) => ({ id: f.id, outSubdir: f.outSubdir })),
    ...(mode === "generate" && strategy === "sheet" && sheetCropMap
      ? { sheetSize: { width: sheetW, height: sheetH }, sheetCropMap }
      : {}),
    imageSize: mode === "generate" && strategy === "sheet" ? `${sheetW}x${sheetH}` : imageSize,
    naming: specsNaming ?? `${pngBasename} per frame folder (outSubdir)`,
    ...(mode === "generate" && strategy ? { strategy } : {}),
    ...(mode === "generate" && keyRgbForManifest
      ? {
          chroma: {
            keyHex: chromaKeyHex,
            keyRgb: keyRgbForManifest,
            tolerance: chromaTolerance,
            postProcess:
              "chromaKeyWithBorderFallback: Euclidean RGB distance vs key; prompt hex first; if <0.8% transparent, median corner-block RGB + higher tolerance",
          },
          seedPolicyPerTile: strategy === "per-tile" ? "Same integer --seed passed to every fal.subscribe in this batch when --seed is set." : null,
        }
      : {}),
  };

  /** @type {Record<string, unknown>} */
  const generationRecipe = {
    mode,
    endpoint: mode === "generate" ? endpoint : null,
    seedRequested: seed ?? null,
    falExtrasPerTile: mode === "generate" && strategy === "per-tile" ? falExtrasPerTile : null,
    falExtrasSheet: mode === "generate" && strategy === "sheet" ? falExtrasSheet : null,
    note: recipeNote,
  };

  return {
    kind,
    preset,
    recipeId,
    createdAt,
    workflow,
    specs,
    generationRecipe,
    frames: [],
    provenance,
    generationResults: {},
  };
}
