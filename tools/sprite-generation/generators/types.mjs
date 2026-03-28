/**
 * Shared JSDoc contracts for sprite generators consumed by
 * `tools/sprite-generation/pipeline.mjs` (**2gp-98mn**).
 *
 * Each generator implements the same async surface so presets can swap mock vs fal
 * without branching the orchestrator.
 */

/**
 * One logical frame in a preset batch (direction id, output hints, prompt text, etc.).
 *
 * @typedef {object} GeneratorFrame
 * @property {string} id  Stable key (e.g. d-pad `"up"`).
 * @property {string} [outSubdir]
 * @property {string} [promptVariant]
 * @property {Record<string, unknown>} [extra]  Preset-specific fields.
 */

/**
 * Result of a single rasterization step (one PNG buffer plus small structured metadata).
 *
 * @typedef {object} GenerateResult
 * @property {import('node:buffer').Buffer} buffer  PNG bytes (typically RGBA).
 * @property {Record<string, unknown>} metadata  e.g. width, height, seed, wallMs, mode.
 */

/**
 * Optional 2×2 sheet placement for mock sheet compositing: cell coordinates in tile units
 * (0 or 1 for a 512² sheet when tileSize is 256).
 *
 * @typedef {Record<string, { x: number; y: number }>} MockSheetLayout
 */

/**
 * @callback ShapeForFrameFn
 * @param {GeneratorFrame} frame
 * @param {{ tileSize: number }} ctx
 * @returns {[{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }]}  Triangle vertices in pixel space.
 */

/**
 * Mock generator options: deterministic RGBA raster with injectable geometry.
 *
 * @typedef {object} MockGeneratorConfig
 * @property {number} [tileSize=256]  Width and height of one frame.
 * @property {number} [seed]  Carried in metadata for parity with fal; mock geometry ignores it unless a preset uses it.
 * @property {ShapeForFrameFn} [shapeForFrame]  Override triangle (or other) shape per frame; defaults to D-pad triangles from `frame.id`.
 * @property {{ r: number; g: number; b: number; a: number }} [fill]  Opaque glyph color; background stays transparent.
 * @property {MockSheetLayout} [sheetLayout]  For mock `generateSheet`: where each `frame.id` sits on a 2×2 sheet (cell coords).
 */

/**
 * fal-backed generator options (subscribe + download). See `generators/fal.mjs`.
 *
 * @typedef {object} FalSubscribeParams
 * @property {string} endpoint
 * @property {string} prompt
 * @property {string} imageSize  e.g. `256x256` or `512x512`
 * @property {number} [seed]
 * @property {boolean} [quiet]
 * @property {Record<string, unknown>} [falExtraInput]
 * @property {import('@fal-ai/client').FalClient['subscribe']} [falSubscribe]  Injected for tests (defaults to `@fal-ai/client` `fal.subscribe`).
 * @property {typeof fetch} [fetch]  Injected for tests (defaults to global `fetch`).
 * @property {(level: 'DEBUG'|'INFO'|'WARN'|'ERROR', step: string, message: string, extra?: Record<string, unknown>) => void} [log]
 */

/**
 * Single-frame entry point — **one** PNG for one preset frame.
 *
 * @callback GeneratorGenerate
 * @param {GeneratorFrame} frame
 * @param {MockGeneratorConfig|FalSubscribeParams|Record<string, unknown>} config
 * @returns {Promise<GenerateResult>}
 */

/**
 * Optional multi-frame / sheet entry point (e.g. one fal job for a 2×2 contact sheet).
 *
 * @callback GeneratorGenerateSheet
 * @param {GeneratorFrame[]} frames
 * @param {MockGeneratorConfig|FalSubscribeParams|Record<string, unknown>} config
 * @returns {Promise<GenerateResult>}
 */

export {};
