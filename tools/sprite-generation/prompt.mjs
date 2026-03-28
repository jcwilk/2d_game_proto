/**
 * Pure string builders for T2I prompts (no I/O, no network).
 * Generalizes dpad-workflow frame/sheet prompts so style, composition, and subject
 * can vary without editing frame lists.
 */

/** @typedef {{ tileSize: number; chromaKeyHex: string; sheetSize?: number }} PromptCtx */

export const DEFAULT_CHROMA_KEY_HEX = "#FF00FF";

/** Suffix after per-frame `subject`: centering, crisp pixels, prohibitions (dpad default). */
export const DPAD_FRAME_PROMPT_SUFFIX =
  ` The glyph is optically centered in the square (roughly equal empty margin on all four sides). ` +
  `Crisp pixel edges, no soft glow, no gradients inside the shape, no shading, no lighting. ` +
  `No other shapes, no text, no duplicate triangles, no shadows, no hardware chrome, no grid lines, no watermark.`;

/** Opening line for dpad per-tile prompts. Placeholders: `{tileSize}`. */
export const DPAD_FRAME_STYLE = `Flat {tileSize}px square pixel art HUD icon. `;

/**
 * Shared background + single-triangle rules before the per-frame subject. Placeholders: `{chromaKeyHex}`.
 */
export const DPAD_FRAME_COMPOSITION =
  `The entire background is one flat solid screen color {chromaKeyHex} (pure magenta), full bleed, no gradients, no vignette, no border frame. ` +
  `Exactly one filled triangle with three straight sides; the ink is a single solid flat color that is NOT {chromaKeyHex} (e.g. dark gray or navy). `;

/** Sheet prompt segments (dpad 2×2 layout). Placeholders: `{sheetSize}`, `{chromaKeyHex}`. */
export const DPAD_SHEET_STYLE = `2x2 pixel art contact sheet on one {sheetSize}px canvas: four equal panels. `;

export const DPAD_SHEET_COMPOSITION =
  `Entire image background is one flat solid screen color {chromaKeyHex} (pure magenta), full bleed, no gradients. ` +
  `One solid filled triangle per panel (same triangle ink color everywhere, not {chromaKeyHex}); triangles small, optically centered in each panel, generous margin; no text, no shadows, no hardware, no pinwheel. `;

export const DPAD_SHEET_SUBJECT =
  `Walk clockwise from top-left: ` +
  `(1) top-left points up, (2) top-right points right, (3) bottom-right points down, (4) bottom-left points left. ` +
  `Each step the triangle rotates 90 degrees from the previous panel — four distinct orientations, not four copies of the same rotation.`;

/**
 * Replace `{tileSize}`, `{sheetSize}`, `{chromaKeyHex}` in a template string.
 * @param {string} template
 * @param {PromptCtx} ctx
 */
export function interpolatePromptTemplate(template, ctx) {
  let s = String(template);
  if (ctx.tileSize !== undefined) s = s.replaceAll("{tileSize}", String(ctx.tileSize));
  if (ctx.sheetSize !== undefined) s = s.replaceAll("{sheetSize}", String(ctx.sheetSize));
  s = s.replaceAll("{chromaKeyHex}", ctx.chromaKeyHex);
  return s;
}

/**
 * Full prompt for one tile/frame: style + composition + subject + optional suffix.
 *
 * @param {object} params
 * @param {number} params.tileSize
 * @param {string} [params.chromaKeyHex] — defaults to {@link DEFAULT_CHROMA_KEY_HEX}
 * @param {string} params.style — may include `{tileSize}` and `{chromaKeyHex}`
 * @param {string} params.composition — may include `{tileSize}` and `{chromaKeyHex}`
 * @param {string} params.subject — per-frame variant (not templated)
 * @param {string} [params.suffix] — appended after subject; defaults to dpad frame suffix for parity with dpad-workflow
 */
export function buildPrompt({ tileSize, chromaKeyHex, style, composition, subject, suffix = DPAD_FRAME_PROMPT_SUFFIX }) {
  const bg = chromaKeyHex || DEFAULT_CHROMA_KEY_HEX;
  const ctx = /** @type {PromptCtx} */ ({ tileSize, chromaKeyHex: bg });
  return interpolatePromptTemplate(style, ctx) + interpolatePromptTemplate(composition, ctx) + subject + suffix;
}

/**
 * Sheet / contact-sheet prompt: style + composition + subject (no separate trailing suffix).
 *
 * @param {object} params
 * @param {number} params.sheetSize — canvas edge length in px (e.g. 512 for 2×2 of 256px tiles)
 * @param {string} [params.chromaKeyHex]
 * @param {string} params.style — may include `{sheetSize}` and `{chromaKeyHex}`
 * @param {string} params.composition — may include `{sheetSize}` and `{chromaKeyHex}`
 * @param {string} params.subject
 */
export function buildSheetPrompt({ sheetSize, chromaKeyHex, style, composition, subject }) {
  const bg = chromaKeyHex || DEFAULT_CHROMA_KEY_HEX;
  const ctx = /** @type {PromptCtx} */ ({ tileSize: sheetSize, sheetSize, chromaKeyHex: bg });
  return interpolatePromptTemplate(style, ctx) + interpolatePromptTemplate(composition, ctx) + subject;
}
