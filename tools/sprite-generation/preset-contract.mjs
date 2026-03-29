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
 * Contract implemented by each **`presets/<assetId>/<assetId>.mjs`** module (named exports only; no default export).
 *
 * @typedef {object} SpritePresetModule
 * @property {string} ASSET_ID Short id matching the directory name under `presets/` (e.g. **`character`**, **`dpad`**).
 * @property {string} MANIFEST_PRESET_ID Manifest **`preset`** field and `buildRecipeId` segment.
 * @property {string} KIND Manifest **`kind`** string.
 * @property {(opts: CreatePresetOptsBase & Record<string, unknown>) => import('./pipeline.mjs').PipelinePreset} createPreset
 * @property {(mode: 'mock'|'generate', strategy?: 'per-tile'|'sheet') => string} recipeId
 */

export {};
