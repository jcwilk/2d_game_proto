/**
 * @file Shared JSDoc contracts for sprite preset modules under `presets/<assetId>/`.
 */

/**
 * Options shared by preset **`createPreset`** implementations (each module may extend).
 *
 * @typedef {object} CreatePresetOptsBase
 * @property {string} outBase Absolute output root for manifest, sprite-ref, and generated assets.
 * @property {string} [artUrlPrefix] Site-root-relative URL prefix for sprite-ref image paths.
 * @property {string} [spriteRefJsonRelativePath] Relative to `outBase`.
 * @property {string} [provenanceTool] Defaults to the preset module path (`tools/sprite-generation/presets/<assetId>/<assetId>.mjs`).
 * @property {number} [provenanceVersion]
 */

/**
 * Contract implemented by each **`presets/<slug>/<slug>.mjs`** module (named exports only; no default export).
 *
 * @typedef {object} SpritePresetModule
 * @property {string} ASSET_ID Short id equal to the directory name under `presets/` and the basename of the module file.
 * @property {string} MANIFEST_PRESET_ID Manifest **`preset`** field and `buildRecipeId` segment.
 * @property {string} KIND Manifest **`kind`** string.
 * @property {'sheet' | 'per-tile'} [DEFAULT_STRATEGY] Default CLI `--strategy` for this preset; defaults to **`sheet`** when omitted.
 * @property {(opts: CreatePresetOptsBase & Record<string, unknown>) => import('./pipeline.mjs').PipelinePreset} createPreset
 * @property {(mode: 'mock'|'generate', strategy?: 'per-tile'|'sheet') => string} recipeId
 */

export {};
