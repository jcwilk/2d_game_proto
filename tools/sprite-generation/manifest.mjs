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

/** Bump when per-tile fal + chroma postprocess contract changes. */
export const RECIPE_VERSION_PER_TILE = "v4-frames-chroma";

/** Bump when sheet fal + crop + chroma contract changes. */
export const RECIPE_VERSION_SHEET = "v13-frames-chroma";

/**
 * @param {{ preset: string; mode: 'mock' | 'generate'; strategy?: 'per-tile' | 'sheet' }} ctx
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
    return `${base}-sheet-${RECIPE_VERSION_SHEET}`;
  }
  if (mode === "generate" && strategy === "per-tile") {
    return `${base}-per-tile-${RECIPE_VERSION_PER_TILE}`;
  }
  throw new Error(`buildRecipeId: need strategy when mode is generate (got ${String(strategy)})`);
}

/**
 * @param {{ mode: 'mock' | 'generate'; strategy?: 'per-tile' | 'sheet'; endpoint: string | null; sheetSize: number }} p
 */
function buildWorkflowLabel(p) {
  if (p.mode === "mock") return "mock (triangles)";
  if (p.mode === "generate" && p.strategy === "sheet") {
    return `fal sheet (${p.endpoint}, ${p.sheetSize}px → crop)`;
  }
  if (p.mode === "generate" && p.strategy === "per-tile") {
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
 *   sheetSize: number;
 * }} p
 */
function buildRecipeNote(p) {
  if (p.mode === "mock") {
    return "Mock: geometry from pngjs triangles, not T2I.";
  }
  if (p.mode === "generate" && p.strategy === "sheet") {
    return `Real: one fal job at ${p.sheetSize}x${p.sheetSize}, crop to ${p.tileSize}px, then chroma-key (${p.chromaKeyHex}) → RGBA.`;
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
 *   endpoint: string | null;
 *   imageSize: string;
 *   tileSize: number;
 *   sheetSize?: number;
 *   sheetCropMap?: Record<string, { x: number; y: number }>;
 *   chromaKeyHex: string;
 *   chromaTolerance: number;
 *   keyRgbForManifest: { r: number; g: number; b: number } | null;
 *   falExtrasPerTile: Record<string, unknown> | null;
 *   falExtrasSheet: Record<string, unknown> | null;
 *   seed?: number | null;
 *   provenance: { tool: string; version: number };
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
    endpoint,
    imageSize,
    tileSize,
    sheetSize = tileSize * 2,
    sheetCropMap,
    chromaKeyHex,
    chromaTolerance,
    keyRgbForManifest,
    falExtrasPerTile,
    falExtrasSheet,
    seed = null,
    provenance,
  } = input;

  const workflow = buildWorkflowLabel({
    mode,
    strategy,
    endpoint,
    sheetSize,
  });

  const recipeNote = buildRecipeNote({ mode, strategy, chromaKeyHex, tileSize, sheetSize });

  /** @type {Record<string, unknown>} */
  const specs = {
    tileSize: { width: tileSize, height: tileSize },
    framePreset: frames.map((f) => ({ id: f.id, outSubdir: f.outSubdir })),
    ...(mode === "generate" && strategy === "sheet" && sheetCropMap
      ? { sheetSize: { width: sheetSize, height: sheetSize }, sheetCropMap }
      : {}),
    imageSize: mode === "generate" && strategy === "sheet" ? `${sheetSize}x${sheetSize}` : imageSize,
    naming: "dpad.png per frame folder (outSubdir)",
    ...(mode === "generate" && strategy ? { strategy } : {}),
    ...(mode === "generate" && keyRgbForManifest
      ? {
          chroma: {
            keyHex: chromaKeyHex,
            keyRgb: keyRgbForManifest,
            tolerance: chromaTolerance,
            postProcess:
              "chromaKeyWithBorderFallback: prompt hex first; if <0.8% transparent, median 1px border RGB + higher tolerance",
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
