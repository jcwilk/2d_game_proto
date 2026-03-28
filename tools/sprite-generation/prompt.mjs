/**
 * Pure string builders for T2I prompts (no I/O, no network).
 * Generalizes dpad-workflow frame/sheet prompts so style, composition, and subject
 * can vary without editing frame lists.
 */

/** @typedef {{ tileSize: number; chromaKeyHex: string; sheetSize?: number; sheetWidth?: number; sheetHeight?: number }} PromptCtx */

export const DEFAULT_CHROMA_KEY_HEX = "#FF00FF";

/** Suffix after per-frame `subject`: centering, crisp pixels, prohibitions (dpad default). */
export const DPAD_FRAME_PROMPT_SUFFIX =
  ` The glyph is optically centered in the square (roughly equal empty margin on all four sides). ` +
  `Crisp pixel edges, no soft glow, no gradients inside the shape, no shading, no lighting. ` +
  `No halo, vignette, or color bleed from the background into the triangle; no pink or magenta fringing on the glyph outline. ` +
  `No other shapes, no text, no duplicate triangles, no extra arrows or chevrons, no shadows, no hardware chrome, no grid lines, no watermark.`;

/** Opening line for dpad per-tile prompts. Placeholders: `{tileSize}`. */
export const DPAD_FRAME_STYLE = `Flat {tileSize}px square pixel art HUD icon. `;

/**
 * Shared background + single-triangle rules before the per-frame subject. Placeholders: `{chromaKeyHex}`.
 */
export const DPAD_FRAME_COMPOSITION =
  `The entire background is one flat solid screen color {chromaKeyHex} (pure magenta), full bleed, no gradients, no vignette, no border frame. ` +
  `Exactly one filled triangle with three straight sides; the glyph fill is a single solid dark neutral gray (approximately #2A2A2A), not {chromaKeyHex}, not blue-tinted. `;

/** Sheet prompt segments (dpad 1×4 horizontal strip). Placeholders: `{sheetWidth}`, `{sheetHeight}`, `{chromaKeyHex}`. */
export const DPAD_SHEET_STYLE =
  `1×4 horizontal pixel art HUD strip on one {sheetWidth}×{sheetHeight}px canvas: four equal square panels in a single row. `;

export const DPAD_SHEET_COMPOSITION =
  `Entire image background is one flat solid screen color {chromaKeyHex} (pure magenta), full bleed, no gradients. ` +
  `One solid filled triangle per panel (same dark neutral gray ink approximately #2A2A2A everywhere, not {chromaKeyHex}, not blue-tinted); triangles small, optically centered in each panel, generous margin; no text, no shadows, no hardware, no pinwheel, no extra arrows. `;

export const DPAD_SHEET_SUBJECT =
  `Panel order left to right: (1) up, (2) down, (3) left, (4) right — one triangle per panel, four distinct orientations.`;

/**
 * Replace `{tileSize}`, `{sheetSize}`, `{sheetWidth}`, `{sheetHeight}`, `{chromaKeyHex}` in a template string.
 * @param {string} template
 * @param {PromptCtx} ctx
 */
export function interpolatePromptTemplate(template, ctx) {
  let s = String(template);
  if (ctx.tileSize !== undefined) s = s.replaceAll("{tileSize}", String(ctx.tileSize));
  if (ctx.sheetSize !== undefined) s = s.replaceAll("{sheetSize}", String(ctx.sheetSize));
  if (ctx.sheetWidth !== undefined) s = s.replaceAll("{sheetWidth}", String(ctx.sheetWidth));
  if (ctx.sheetHeight !== undefined) s = s.replaceAll("{sheetHeight}", String(ctx.sheetHeight));
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
 * @param {number} [params.sheetSize] — legacy square canvas edge (used when `sheetWidth`/`sheetHeight` omitted)
 * @param {number} [params.sheetWidth] — rectangular canvas width (px)
 * @param {number} [params.sheetHeight] — rectangular canvas height (px)
 * @param {string} [params.chromaKeyHex]
 * @param {string} params.style — may include `{sheetWidth}`, `{sheetHeight}`, `{sheetSize}`, `{chromaKeyHex}`
 * @param {string} params.composition — may include `{chromaKeyHex}`
 * @param {string} params.subject
 */
export function buildSheetPrompt({ sheetSize, sheetWidth, sheetHeight, chromaKeyHex, style, composition, subject }) {
  const bg = chromaKeyHex || DEFAULT_CHROMA_KEY_HEX;
  const sw = sheetWidth ?? sheetSize;
  const sh = sheetHeight ?? sheetSize;
  const ss = sheetSize ?? sw;
  const ctx = /** @type {PromptCtx} */ ({
    tileSize: ss,
    sheetSize: ss,
    sheetWidth: sw,
    sheetHeight: sh,
    chromaKeyHex: bg,
  });
  return interpolatePromptTemplate(style, ctx) + interpolatePromptTemplate(composition, ctx) + subject;
}
