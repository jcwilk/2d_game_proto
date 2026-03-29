/**
 * Pure string builders for T2I prompts (no I/O, no network).
 * Generalizes dpad-workflow frame/sheet prompts so style, composition, and subject
 * can vary without editing frame lists.
 */

/** @typedef {{ tileSize: number; chromaKeyHex: string; sheetSize?: number; sheetWidth?: number; sheetHeight?: number }} PromptCtx */

export const DEFAULT_CHROMA_KEY_HEX = "#FF00FF";

/** Suffix after per-frame `subject`: centering; per-tile strategy only (sheet uses {@link buildDpadGridSpritePrompt}). */
export const DPAD_FRAME_PROMPT_SUFFIX =
  ` The glyph is optically centered in the square (roughly equal empty margin on all four sides). ` +
  `Readable at small size; subtle soft shading, light bevel, or gentle inner gradient within the triangle is OK for material read — avoid muddy blur. ` +
  `No halo, vignette, or color bleed from the background into the triangle; keep the glyph edge crisp. ` +
  `No other shapes, no text, no duplicate triangles, no extra arrows or chevrons, no hardware chrome frame, no grid lines, no watermark.`;

/** Opening line for dpad per-tile prompts. Placeholders: `{tileSize}`. */
export const DPAD_FRAME_STYLE = `Stylized {tileSize}px square 2D HUD direction glyph (game UI, not photoreal). `;

/**
 * Shared background + single-triangle rules before the per-frame subject (per-tile strategy only).
 * Placeholders: `{chromaKeyHex}` — kept for legacy chroma postprocess; prefer sheet + {@link buildDpadGridSpritePrompt}.
 */
export const DPAD_FRAME_COMPOSITION =
  `The entire background is one flat solid screen color {chromaKeyHex} (pure magenta), full bleed, no gradients, no vignette, no border frame. ` +
  `Exactly one filled triangle with three straight sides. ` +
  `Use a cohesive, natural-looking fill: muted slate, warm gray, soft blue-gray, or desaturated stone — pick one palette and stick to it; ` +
  `light highlights and soft shadow on the glyph are OK. ` +
  `Do not use {chromaKeyHex}, hot pink, fuchsia, or magenta in the triangle (reserved for the keyable background). `;

/** Sheet prompt segments (dpad 1×4 horizontal strip). Placeholders: `{sheetWidth}`, `{sheetHeight}`, `{chromaKeyHex}`. */
export const DPAD_SHEET_STYLE =
  `1×4 horizontal stylized 2D HUD direction strip on one {sheetWidth}×{sheetHeight}px canvas: four equal square panels in a single row. `;

export const DPAD_SHEET_COMPOSITION =
  `Entire image background is one flat solid screen color {chromaKeyHex} (pure magenta), full bleed, no gradients. ` +
  `One triangle per panel: same material, palette, and stylistic treatment in all four — muted natural colors, subtle bevel or soft cel-shade OK; ` +
  `not {chromaKeyHex} on the glyphs. Triangles small, optically centered, generous margin; ` +
  `no text, no pinwheel, no extra arrows beyond the four directions. `;

export const DPAD_SHEET_SUBJECT =
  `Panel order left to right: (1) up, (2) down, (3) left, (4) right — one triangle per panel, four distinct orientations, consistent design language.`;

/** Base line for {@link buildDpadGridSpritePrompt} (`HUD GLYPH AND DIRECTION`). Sheet T2I default when rewrite is off. */
export const DPAD_FALSPRITE_SHEET_SUBJECT =
  `Stylized 2D HUD direction set (game UI, not photoreal). ` +
  `Panel order left-to-right, top row then bottom (2×2 grid): (1) NORTH / up; (2) SOUTH / down; ` +
  `(3) WEST / left; (4) EAST / right — one triangle per cell, four distinct orientations, consistent design language.`;

/**
 * OpenRouter sheet rewrite for 2×2 HUD grid (no chroma-hex language; flat backdrop only).
 */
export const DPAD_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT =
  "You rewrite image-generation prompts for ONE 2×2 HUD sprite sheet (four equal cells in row-major order: up, down, left, right). " +
  "Preserve: exact 2×2 grid, four single triangles in those orientations only, one uniform flat-color background, no extra arrows. " +
  "Improve: prefer subtle rough stone texture for the triangle fills (matte, lightly granular, soft weathered edges, not glossy); cohesive muted earthy palette; subtle depth or bevel language — still flat 2D game UI glyphs, not photoreal rocks or 3D extruded buttons. " +
  "Output only the improved prompt text, no preamble.";

/**
 * OpenRouter sheet rewrite (**`preset.fal.sheetRewrite`**) — legacy **1×4** strip: variety while keeping geometry + chroma.
 * @deprecated D-pad sheet preset uses {@link DPAD_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT} and 2×2 {@link buildDpadGridSpritePrompt}.
 */
export const DPAD_SHEET_REWRITE_SYSTEM_PROMPT =
  "You rewrite image-generation prompts for ONE horizontal 1×4 HUD sprite sheet (four equal panels: up, down, left, right). " +
  "Preserve: exact panel grid, dimensions, chroma key background color, four single triangles in those orientations only, no extra arrows. " +
  "Improve: tasteful material (soft plastic, brushed metal, stone, or paper UI), cohesive muted palette, subtle depth or bevel language — still flat 2D game UI glyphs, not photoreal objects or 3D extruded buttons. " +
  "Output only the improved prompt text, no preamble.";

/** Suffix for character walk frames: centered figure, chroma-friendly edges. */
export const CHARACTER_WALK_FRAME_PROMPT_SUFFIX =
  ` The character is optically centered in the square (roughly equal empty margin on all four sides). ` +
  `Readable silhouette; light cel-shading or soft ambient occlusion is OK; avoid heavy motion blur. ` +
  `No halo or color bleed from the background into the figure; minimize pink or magenta fringing on the outline. ` +
  `No text, no watermark, no duplicate characters, no extra limbs, no grid lines.`;

/** Per-frame walk **`frameStyle`** line lives in **`presets/avatar-character/avatar-character.mjs`** (`CHARACTER_WALK_FRAME_STYLE`). */

/**
 * Shared background + single-character rules. Placeholders: `{chromaKeyHex}`.
 */
export const CHARACTER_WALK_FRAME_COMPOSITION =
  `The entire background is one flat solid screen color {chromaKeyHex} (pure magenta), full bleed, no gradients, no vignette, no border frame. ` +
  `Exactly one small humanoid figure (head + torso + two legs visible). ` +
  `Use a coherent, creative palette: natural skin tones, clothing, and hair as you like — varied, expressive colors. ` +
  `Do not use {chromaKeyHex}, hot pink, fuchsia, or magenta in the figure, clothing, or shadows (those are reserved for the keyable background). ` +
  `Avoid neon purples that could be confused with the background. `;

/** 1×4 horizontal strip for four walk phases. Placeholders: `{sheetWidth}`, `{sheetHeight}`, `{chromaKeyHex}`. */
export const CHARACTER_WALK_SHEET_STYLE =
  `1×4 horizontal stylized 2D game character strip on one {sheetWidth}×{sheetHeight}px canvas: four equal square panels in a single row. `;

export const CHARACTER_WALK_SHEET_COMPOSITION =
  `Entire image background is one flat solid screen color {chromaKeyHex} (pure magenta), full bleed, no gradients. ` +
  `One character per panel: same identity, outfit, and palette across all four — creative color, believable materials, light shading OK. ` +
  `Do not use {chromaKeyHex}, hot pink, fuchsia, or magenta on the character or cast shadows. ` +
  `Figures small, optically centered, generous margin; four sequential walk-cycle poses left-to-right; no text, no duplicate rows. `;

/** Sheet subject line for falsprite T2I lives in **`presets/avatar-character/avatar-character.mjs`** (`CHARACTER_FALSPRITE_SHEET_SUBJECT`). */

/**
 * OpenRouter sheet rewrite — **legacy 1×4 chroma strip** (D-pad / older character docs).
 * @deprecated For character walk sheet T2I, use {@link CHARACTER_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT} (matches [falsprite](https://github.com/lovisdotio/falsprite) `buildRewriteSystemPrompt`).
 */
export const CHARACTER_SHEET_REWRITE_SYSTEM_PROMPT =
  "You rewrite image-generation prompts for ONE horizontal 1×4 sprite sheet (four equal panels, left to right walk cycle). " +
  "Preserve: exact panel grid, dimensions, chroma key background color, four distinct walk phases in order, single consistent character. " +
  "Improve: vivid but coherent clothing and skin tones, material read, subtle personality, and clear readable poses — still a 2D game sprite, not a full illustration or photoreal render. " +
  "Output only the improved prompt text, no preamble.";

const FALSPRITE_NUM_WORDS = /** @type {Record<number, string>} */ ({
  2: "two",
  3: "three",
  4: "four",
  5: "five",
  6: "six",
});

/**
 * Mirrors [falsprite `buildSpritePrompt`](https://github.com/lovisdotio/falsprite/blob/main/lib/fal.mjs): technical grid + motion block, then **`basePrompt`** as "CHARACTER AND ANIMATION DIRECTION".
 * **`gridSize`** is **N** for an **N×N** cell grid (e.g. **2** → 2×2 sheet). No chroma hex — background is "plain solid flat-color" only.
 *
 * @param {string} basePrompt  Rewritten or static choreography / subject (single block, no surrounding newlines).
 * @param {number} [gridSize=4]  Clamped implicitly to supported map keys; unknown → `"four"`.
 * @returns {string}
 */
/**
 * D-pad HUD sheet T2I: same grid discipline as {@link buildFalspriteStyleSpritePrompt}, but four
 * directional triangles (no character / walk language). No chroma hex — flat backdrop only.
 *
 * @param {string} basePrompt  Rewritten or static HUD/direction block (single block).
 * @param {number} [gridSize=2]  N for an N×N cell grid (D-pad uses **2**).
 * @returns {string}
 */
export function buildDpadGridSpritePrompt(basePrompt, gridSize = 2) {
  const w = FALSPRITE_NUM_WORDS[gridSize] ?? "two";
  return [
    "STRICT TECHNICAL REQUIREMENTS FOR THIS IMAGE:",
    "",
    `FORMAT: A single image containing a ${w}-by-${w} grid of equally sized cells.`,
    "Every cell must be the exact same dimensions, perfectly aligned, with no gaps or overlap.",
    "",
    "FORBIDDEN: Absolutely no text, no numbers, no letters, no digits, no labels,",
    "no watermarks, no signatures, no UI chrome outside the four direction glyphs.",
    "",
    "CONSISTENCY: The same visual style, palette, and material treatment in every cell.",
    "Stylized 2D HUD direction triangles — game UI, not photoreal hardware.",
    "Strong clean silhouette for each glyph against a plain solid flat-color background",
    "(one uniform screen color across the entire image — no gradients in the backdrop).",
    "",
    "PANEL FLOW: Cells read left-to-right, top-to-bottom. Each cell contains exactly one",
    "filled triangle with three straight sides — one orientation per cell (four distinct directions).",
    "",
    "HUD GLYPH AND DIRECTION:",
    basePrompt,
  ].join("\n");
}

export function buildFalspriteStyleSpritePrompt(basePrompt, gridSize = 4) {
  const w = FALSPRITE_NUM_WORDS[gridSize] ?? "four";
  return [
    "STRICT TECHNICAL REQUIREMENTS FOR THIS IMAGE:",
    "",
    `FORMAT: A single image containing a ${w}-by-${w} grid of equally sized cells.`,
    "Every cell must be the exact same dimensions, perfectly aligned, with no gaps or overlap.",
    "",
    "FORBIDDEN: Absolutely no text, no numbers, no letters, no digits, no labels,",
    "no watermarks, no signatures, no UI elements anywhere in the image. The image must",
    "contain ONLY the character illustrations in the grid cells and nothing else.",
    "",
    "CONSISTENCY: The exact same single character must appear in every cell.",
    "Same proportions, same art style, same level of detail, same camera angle throughout.",
    "Isometric three-quarter view. Full body visible head to toe in every cell.",
    "Strong clean silhouette against a plain solid flat-color background.",
    "",
    "ANIMATION FLOW: The cells read left-to-right, top-to-bottom, like reading a page.",
    "This is one continuous motion sequence. Each cell shows the next moment in the movement.",
    "The transition between the last cell of one row and the first cell of the next row",
    "must be just as smooth as transitions within a row — no jumps, no resets.",
    `Each row contains ${w} phases of the motion. The very last cell loops back seamlessly`,
    "to the very first cell.",
    "",
    "MOTION QUALITY: Show real weight and physics. Bodies shift weight between feet.",
    "Arms counterbalance legs. Torsos rotate into actions. Follow-through on every movement.",
    "No stiff poses — every cell must feel like a freeze-frame of fluid motion.",
    "For locomotion (walk/run): strictly alternate left and right legs — one leg extends forward",
    "while the other pushes behind. Each frame must show a clearly different leg position.",
    "Never repeat the same pose twice in a row.",
    "",
    "CHARACTER AND ANIMATION DIRECTION:",
    basePrompt,
  ].join("\n");
}

/**
 * Mirrors [falsprite `buildRewriteSystemPrompt`](https://github.com/lovisdotio/falsprite/blob/main/lib/fal.mjs) for OpenRouter before T2I.
 *
 * @param {number} [gridSize=4]  Beat count / grid dimension (same as **`buildFalspriteStyleSpritePrompt`**).
 * @returns {string}
 */
export function buildFalspriteSheetRewriteSystemPrompt(gridSize = 4) {
  const w = FALSPRITE_NUM_WORDS[gridSize] ?? "four";
  return [
    "You are an animation director and character designer for a sprite sheet pipeline.",
    "Given a character concept, you MUST return exactly two sections, nothing else:",
    "",
    "CHARACTER: A vivid description of the character's appearance — body type, armor, weapons, colors, silhouette, art style. Be extremely specific and visual.",
    "",
    `CHOREOGRAPHY: A ${w}-beat continuous animation loop that showcases this specific character's personality and abilities. Each beat is one row of the sheet. The last beat must transition seamlessly back into the first.`,
    "For each beat, describe the body position, weight distribution, limb placement, and motion arc in one sentence.",
    "The choreography must feel natural and unique to THIS character — a mage animates differently than a knight, a dancer differently than a berserker.",
    "",
    "RULES:",
    "- Never use numbers or digits anywhere.",
    "- Never mention grids, pixels, frames, cells, or image generation.",
    "- Never mention sprite sheets or technical terms.",
    "- Write as if directing a real actor through a motion capture session.",
    `- The ${w} beats must form one fluid, looping performance.`,
    "- For locomotion (walk/run): strictly alternate left and right legs in each beat.",
    " Describe exact limb positions — which leg is forward, which is pushing off,",
    " which arm is swinging forward. Every beat must show a distinctly different leg configuration.",
  ].join("\n");
}

/** Character walk (2×2 grid): OpenRouter system prompt aligned with falsprite. */
export const CHARACTER_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT = buildFalspriteSheetRewriteSystemPrompt(2);

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
