/**
 * Shared contracts for sprite preset modules under `presets/<assetId>/`.
 *
 * Runtime implementations remain in **`presets/<slug>/<slug>.mjs`** until migrated.
 * **`PipelinePreset`** is defined in **`pipeline.mjs`** (JSDoc typedef) — **`createPreset`** return type
 * is left as **`unknown`** here until **`pipeline`** is TypeScript (**2gp-bdeg**).
 */

/** Options shared by preset `createPreset` implementations (each module may extend). */
export interface CreatePresetOptsBase {
  /** Absolute output root for manifest, sprite-ref, and generated assets. */
  outBase: string;
  /** Site-root-relative URL prefix for sprite-ref image paths. */
  artUrlPrefix?: string;
  /** Relative to `outBase`. */
  spriteRefJsonRelativePath?: string;
  /** Defaults to the preset module path (`tools/sprite-generation/presets/<assetId>/<assetId>.mjs`). */
  provenanceTool?: string;
  provenanceVersion?: number;
}

/**
 * Contract implemented by each **`presets/<slug>/<slug>.mjs`** module (named exports only; no default export).
 *
 * @see `../pipeline.mjs` — `PipelinePreset` typedef for `createPreset` result shape.
 */
export interface SpritePresetModule {
  /** Short id equal to the directory name under `presets/` and the basename of the module file. */
  ASSET_ID: string;
  /** Manifest `preset` field and `buildRecipeId` segment. */
  MANIFEST_PRESET_ID: string;
  /** Manifest `kind` string. */
  KIND: string;
  /** Default CLI `--strategy` for this preset; defaults to `sheet` when omitted. */
  DEFAULT_STRATEGY?: "sheet" | "per-tile";
  createPreset: (opts: CreatePresetOptsBase & Record<string, unknown>) => unknown;
  recipeId: (mode: "mock" | "generate", strategy?: "per-tile" | "sheet") => string;
}
