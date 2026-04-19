/**
 * Pure string builders for T2I prompts (no I/O, no network).
 * Generalizes dpad-workflow frame/sheet prompts so style, composition, and subject
 * can vary without editing frame lists.
 */

export interface PromptCtx {
  tileSize: number;
  chromaKeyHex: string;
  sheetSize?: number;
  sheetWidth?: number;
  sheetHeight?: number;
  cellWidth?: number;
  cellHeight?: number;
}

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

/** Suffix for character walk frames — same framing as {@link buildFalspriteStyleSpritePrompt} (per-tile strategy). */
export const CHARACTER_WALK_FRAME_PROMPT_SUFFIX =
  ` **Framing in this {cellWidth}×{cellHeight}px cell** (**width:height = 2:5** — same footprint width as floor; height = 2.5× width): horizontally center the character on the cell midline. ` +
  `**Top of the head** on the midline **10% of the cell height** down from the top edge (mock-aligned). ` +
  `**Ground contact** between the feet on the midline **20% of the cell height above the bottom edge** (**W/4** foot clearance — same as \`CHARACTER_WALK_FRAME_FEET_INSET_FROM_BOTTOM_PX\`, **not** 10%). ` +
  `Torso/head/leg proportions ~**10/64**, **12/64**, **5/64** widths and **~28%** / **~32%** heights vs cell (see mock). ` +
  `Scale the figure to hit these landmarks; do not crop head or feet. ` +
  `Readable silhouette; light cel-shading or soft ambient occlusion is OK; avoid heavy motion blur. ` +
  `No halo or color bleed from the background into the figure; minimize pink or magenta fringing on the outline. ` +
  `No text, no watermark, no duplicate characters, no extra limbs, no grid lines.`;

/** Per-frame walk **`frameStyle`** line lives in the relevant walk-cycle preset module (`CHARACTER_WALK_FRAME_STYLE`). */

/**
 * Shared background + single-character rules. Placeholders: `{chromaKeyHex}`.
 */
export const CHARACTER_WALK_FRAME_COMPOSITION =
  `The entire background is one flat solid screen color {chromaKeyHex} (pure magenta), full bleed, no gradients, no vignette, no border frame. ` +
  `Exactly one small humanoid figure (head + torso + two legs visible) in **isometric three-quarter view** (oblique: front plus one side readable). ` +
  `Use a coherent, creative palette: natural skin tones, clothing, and hair as you like — varied, expressive colors. ` +
  `Do not use {chromaKeyHex}, hot pink, fuchsia, or magenta in the figure, clothing, or shadows (those are reserved for the keyable background). ` +
  `Avoid neon purples that could be confused with the background. `;

/** 1×4 horizontal strip for four walk phases. Placeholders: `{sheetWidth}`, `{sheetHeight}`, `{chromaKeyHex}`. */
export const CHARACTER_WALK_SHEET_STYLE =
  `1×4 horizontal stylized 2D game character strip on one {sheetWidth}×{sheetHeight}px canvas: four equal rectangular panels in a single row (each cell width matches floor footprint width; height **2.5×** width). `;

export const CHARACTER_WALK_SHEET_COMPOSITION =
  `Entire image background is one flat solid screen color {chromaKeyHex} (pure magenta), full bleed, no gradients. ` +
  `One character per panel: same identity, outfit, and palette across all four — creative color, believable materials, light shading OK. ` +
  `Do not use {chromaKeyHex}, hot pink, fuchsia, or magenta on the character or cast shadows. ` +
  `Same isometric three-quarter camera and per-cell framing (midline-centered; **top of head 10%** down from top; **soles 20%** up from bottom — mock pipeline) in every panel; four sequential walk-cycle poses; no text, no duplicate rows. `;

/** Sheet subject line for falsprite T2I lives in the relevant walk-cycle preset module (`CHARACTER_FALSPRITE_SHEET_SUBJECT`). */

/**
 * OpenRouter sheet rewrite — **legacy 1×4 chroma strip** (D-pad / older character docs).
 * @deprecated For character walk sheet T2I, use {@link CHARACTER_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT} (matches [falsprite](https://github.com/lovisdotio/falsprite) `buildRewriteSystemPrompt`).
 */
export const CHARACTER_SHEET_REWRITE_SYSTEM_PROMPT =
  "You rewrite image-generation prompts for ONE horizontal 1×4 sprite sheet (four equal panels, left to right walk cycle). " +
  "Preserve: exact panel grid, dimensions, chroma key background color, four distinct walk phases in order, single consistent character. " +
  "Improve: vivid but coherent clothing and skin tones, material read, subtle personality, and clear readable poses — still a 2D game sprite, not a full illustration or photoreal render. " +
  "Output only the improved prompt text, no preamble.";

const FALSPRITE_NUM_WORDS: Record<number, string> = {
  2: "two",
  3: "three",
  4: "four",
  5: "five",
  6: "six",
};

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
/** Suffix for isometric floor frames (per-tile). Placeholders: `{cellWidth}`, `{cellHeight}`. */
export const ISO_FLOOR_FRAME_PROMPT_SUFFIX =
  ` **CELL SHAPE:** Each cell is **{cellWidth}×{cellHeight}px** with **width exactly twice height** (2:1). ` +
  `The walkable patch is a foreshortened isometric rhombus **flush to all four cell edges**: ` +
  `**bottom vertex** on the **bottom-edge center**, **top vertex** on the **top-edge center**, **left vertex** on the **left-edge midpoint**, **right vertex** on the **right-edge midpoint** — the diamond touches every edge at its middle; **no** dead band above or below the rhombus inside the cell. ` +
  `**FORBIDDEN:** square cells; 2×2 grids; floating or vertically centered diamonds with empty margin inside the cell. ` +
  `Readable surface detail inside the rhombus only; crisp boundary; flat uniform backdrop outside. No text, watermark, or second tile.`;

/** Per-tile style. Placeholders: `{cellWidth}`, `{cellHeight}`. */
export const ISO_FLOOR_FRAME_STYLE =
  `Illustrated {cellWidth}×{cellHeight}px rectangular isometric floor cell (2:1 wide:tall) — painterly or soft cel-shaded, readable at small scale, not pixel art, not photoreal. `;

/**
 * Chroma backdrop + flush rhombus. Placeholders: `{chromaKeyHex}`, `{cellWidth}`, `{cellHeight}`.
 */
export const ISO_FLOOR_FRAME_COMPOSITION =
  `The entire background is one flat solid screen color {chromaKeyHex} (pure magenta), full bleed, no gradients, no vignette, no border frame — backdrop extends **flush to all four cell edges** with no inner margin or “mat” around the rhombus. ` +
  `Exactly one walkable ground rhombus per image, drawn in true pixel perspective inside a **{cellWidth}×{cellHeight}** rectangle (width = twice height). ` +
  `Vertices sit on **edge midpoints**: bottom on bottom-center, top on top-center, left on left-mid, right on right-mid — the cell height **is** the foreshortened vertical span. ` +
  `Same outline in every variation for seamless horizontal tiling. ` +
  `Inside the rhombus only: open floor with subtle variation; no walls, no props. ` +
  `Do not use {chromaKeyHex}, hot pink, fuchsia, or magenta on the floor surface (reserved for the flat backdrop only). ` +
  `No halo or color bleed from the backdrop into the floor; minimize pink, magenta, or purple fringing on the rhombus outline (same edge discipline as illustrated character sprites). `;

/** Base subject for sheet T2I + rewrite seed (1×4 strip). */
export const ISO_FLOOR_FALSPRITE_SHEET_SUBJECT =
  `Illustrated isometric open-floor strip (not pixel art). ` +
  `One horizontal row of **four** cells, left to right: (1) clean faint grain; (2) light cracks; (3) scattered grit; (4) slightly darker worn patch — ` +
  `each cell **{cellWidth}×{cellHeight}** (2:1), same flush-edge rhombus footprint in all four.`;

export const ISO_FLOOR_SHEET_REWRITE_USER_SEED =
  "One row of four isometric floor tiles; each cell is half as tall as wide; rhombus touches top, bottom, left, and right edge midpoints; four subtle surface variations; identical geometry for tiling. " +
  "No vertical gutters, panel frames, or outlines between columns — one continuous plain flat-color backdrop at shared cell boundaries (illustrated-game style, not chroma-key vocabulary).";

/** OpenRouter sheet rewrite for 1×4 isometric floor strip. */
export const ISO_FLOOR_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT =
  "You rewrite image-generation prompts for ONE horizontal strip sprite sheet: **four equal cells in a single row** (1×4, not 2×2). " +
  "Preserve as non-negotiable: each cell is **rectangular** — **width is exactly twice the height**; each cell contains one foreshortened ground **rhombus** whose four vertices lie on the **midpoints of the four cell edges** (bottom vertex bottom-center, top vertex top-center, left/right on side-midpoints) — the diamond fills the short cell with **no** internal vertical margin; same geometry in all four cells; **plain uniform flat-color backdrop** only outside the rhombus (one calm solid hue, full bleed, no gradients), **flush to every cell edge** — same backdrop philosophy as illustrated **character** sprite prompts: **do not** mention chroma keys, greenscreen, matting, or bright magenta/fuchsia as the background; **no** vertical gutters, contact-sheet borders, divider lines, pinstripes, inner shadows, or tonal bands **between** columns — the backdrop reads as **one continuous strip**, not four framed panels; no props or walls; do not describe post-processing to fake perspective. " +
  "Improve: cohesive dark-fantasy ground read, subtle wear and micro-detail differences between cells only — still clean 2D game tiles, not photoreal cobblestones or 3D extrusion; keep rhombus edges clean with **no** pink/purple glow or colored halos at tile boundaries. " +
  "Output only the improved prompt text, no preamble.";

/**
 * Isometric floor sheet T2I: same grid discipline as {@link buildDpadGridSpritePrompt}, for terrain diamonds.
 *
 * @param {string} basePrompt  Subject / material block (single paragraph).
 * @param {number} [gridSize=2]  N for an N×N cell grid.
 * @returns {string}
 */
export function buildIsometricFloorGridSpritePrompt(basePrompt: string, gridSize = 2): string {
  const w = FALSPRITE_NUM_WORDS[gridSize] ?? "two";
  return [
    "STRICT TECHNICAL REQUIREMENTS FOR THIS IMAGE:",
    "",
    `FORMAT: A single image containing a ${w}-by-${w} grid of equally sized cells.`,
    "Every cell must be the exact same dimensions, perfectly aligned, with no gaps or overlap.",
    "",
    "FORBIDDEN: Absolutely no text, no numbers, no letters, no digits, no labels,",
    "no watermarks, no signatures, no UI chrome.",
    "",
    "CONSISTENCY: The same isometric floor art style and foreshortened rhombus footprint in every cell — only subtle surface details differ.",
    "",
    "CRITICAL PLACEMENT (every cell, identical — matches game dimensions / bottom-middle cell anchor):",
    "Each cell has exactly ONE ground rhombus. The **bottom vertex** of that rhombus (the ground corner closest to the viewer) MUST lie on the **bottom edge of the cell at its horizontal center** — the midpoint of the bottom edge, not the center of the cell.",
    "**FORBIDDEN:** vertically centering the rhombus in the square; equal empty margin above and below the diamond; any gap between the bottom vertex and the bottom edge of the cell.",
    "The rhombus extends **upward** from that bottom-middle anchor; leave **most** of the flat background color in the **upper** portion of the cell above the diamond.",
    "Left and right vertices at the midpoints of the left and right cell edges, at the vertical position halfway between top and bottom vertices; about twice as wide as tall.",
    "Walkable surface only inside the rhombus; strong silhouette against a plain solid flat-color background outside it.",
    "",
    "PANEL FLOW: Cells read left-to-right, top-to-bottom. Four distinct cosmetic variations of open walkable floor.",
    "",
    "ISOMETRIC FLOOR DIRECTION:",
    basePrompt,
  ].join("\n");
}

/**
 * Isometric open-floor **1×4** strip: four cells in one row; each cell **2:1** (width = twice height); rhombus flush to all four edges.
 *
 * @param {string} basePrompt  Rewritten or static material / variation block.
 * @param {number} sheetWidth  Total sheet width (px).
 * @param {number} sheetHeight  Total sheet height (px) — equals one cell height.
 * @returns {string}
 */
export function buildIsometricFloorStripSpritePrompt(basePrompt: string, sheetWidth: number, sheetHeight: number): string {
  const cw = Math.round(sheetWidth / 4);
  const ch = Math.round(sheetHeight);
  return [
    "STRICT TECHNICAL REQUIREMENTS FOR THIS IMAGE:",
    "",
    `FORMAT: A single image, total canvas **${sheetWidth}×${sheetHeight}px**, containing **one horizontal row of four** equal cells (four columns, **one** row — a **1×4** strip).`,
    `Each cell is **${cw}×${ch}px** with **width exactly twice height** (2:1 wide-to-tall); cells are **rectangular**, not square.`,
    "Every cell must align perfectly on the grid with no gaps or overlap.",
    "",
    "FORBIDDEN: Absolutely no text, no numbers, no letters, no digits, no labels,",
    "no watermarks, no signatures, no UI chrome.",
    "FORBIDDEN: a 2×2 grid; square cells; stacking cells in two rows.",
    "",
    "CONSISTENCY: The same isometric floor art style and identical rhombus footprint in every cell — only subtle surface details differ.",
    "",
    "GEOMETRY IN EVERY CELL (identical):",
    "Each cell contains exactly ONE foreshortened isometric **ground rhombus** drawn in pixel space.",
    "Because the cell is **short** (half as tall as wide), the rhombus **fills the cell flush to all four edges**:",
    "- **Bottom vertex** on the **bottom-edge center** of the cell.",
    "- **Top vertex** on the **top-edge center** of the cell.",
    "- **Left vertex** on the **midpoint of the left edge**.",
    "- **Right vertex** on the **midpoint of the right edge**.",
    "**No** unused vertical margin inside the cell above or below the diamond — the cell height **is** the foreshortened vertical span.",
    "Walkable surface only inside the rhombus; strong silhouette against a **plain solid flat-color** background outside it (same style as character sprite sheets: one uniform backdrop hue, full bleed, no gradients).",
    "",
    "BACKDROP AND EDGES (match illustrated-character policy — avoid greenscreen / chroma artifacts):",
    "Do **not** describe chroma keys, greenscreen, matting, or any specific fluorescent backdrop color (no magenta/fuchsia/hot-pink vocabulary).",
    "The flat fill outside the rhombus is simply a calm neutral flat color; **no** halo, colored outline, glow, or pink/magenta/purple fringing along the rhombus edge or at column boundaries.",
    "",
    "SEAMS BETWEEN COLUMNS (critical for cropping):",
    "The strip is **one continuous image**, not four separate framed panels. That flat backdrop is **uniform** across each interior vertical boundary: **no** gutters, divider lines, hairline rules, pinstripes, contact-sheet borders, beveled grooves, inner shadows, embossing, or darker/lighter vertical bands trapped between columns.",
    "The backdrop must reach **fully** to the left and right edge of **every** cell, including along shared edges between neighbors — **no** narrow outline or halo that reads as a seam when the sheet is split into four crops.",
    "",
    "PANEL FLOW: Cells read left-to-right. Four distinct cosmetic variations of open walkable floor.",
    "",
    "ISOMETRIC FLOOR DIRECTION:",
    basePrompt,
  ].join("\n");
}

export function buildDpadGridSpritePrompt(basePrompt: string, gridSize = 2): string {
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

export function buildFalspriteStyleSpritePrompt(basePrompt: string, gridSize = 4): string {
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
    "Camera: **isometric three-quarter view** (three-fourths): a stable oblique angle that shows a readable front plane and one side of the body together — classic game isometric staging, not a flat orthographic side profile, not top-down, not a straight-on card portrait.",
    "Full body visible head to toe in every cell.",
    "",
    "FRAMING IN EACH CELL (identical geometry in every cell — matches **`renderCharacterWalkMockTileBuffer`** / `CHARACTER_WALK_FRAME_FEET_INSET_FROM_BOTTOM_PX`):",
    "**Horizontal:** center the character on the vertical midline (equal margin left and right).",
    "**Vertical:** **top of the head** on the midline **10% of the cell height** **down** from the top edge; **ground contact** between the feet **20% of the cell height above** the bottom edge (**W/4** clearance, **not** 10%).",
    "**Proportions:** head ~**10/64** of cell width; torso ~**12/64** wide × ~**28%** cell height; legs ~**5/64** wide × up to ~**32%** cell height — compact, mock-consistent.",
    "Scale the figure so these landmarks match; do not crop head or feet; keep limbs inside the cell.",
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
 * Character walk **1×4** horizontal strip (four cells, one row — each cell **width:height = 2:5**, floor-width × tall).
 * Same framing and motion quality as {@link buildFalspriteStyleSpritePrompt} but **no** 2×2 grid — animation reads **left to right only**.
 *
 * @param {string} basePrompt  Rewritten or static choreography / subject (single block).
 * @param {number} sheetWidth  Nominal sheet width (px), e.g. **4×** frame width.
 * @param {number} sheetHeight  Nominal sheet height (px), e.g. one frame height.
 * @returns {string}
 */
export function buildCharacterWalkStripSpritePrompt(basePrompt: string, sheetWidth: number, sheetHeight: number): string {
  const cw = Math.round(sheetWidth / 4);
  const ch = Math.round(sheetHeight);
  return [
    "STRICT TECHNICAL REQUIREMENTS FOR THIS IMAGE:",
    "",
    `FORMAT: A single image, total canvas **${sheetWidth}×${sheetHeight}px**, containing **one horizontal row of four** equal cells (four columns, **one** row — a **1×4** strip).`,
    `Each cell is **${cw}×${ch}px** — **width:height = 2:5** (not square): width matches the floor footprint; height is **2.5×** that width (full-body figure).`,
    "Every cell must be the exact same dimensions, perfectly aligned, with no gaps or overlap.",
    "",
    "FORBIDDEN: Absolutely no text, no numbers, no letters, no digits, no labels,",
    "no watermarks, no signatures, no UI elements anywhere in the image. The image must",
    "contain ONLY the character illustrations in the grid cells and nothing else.",
    "",
    "CONSISTENCY: The exact same single character must appear in every cell.",
    "Same proportions, same art style, same level of detail, same camera angle throughout.",
    "Camera: **isometric three-quarter view** (three-fourths): a stable oblique angle that shows a readable front plane and one side of the body together — classic game isometric staging, not a flat orthographic side profile, not top-down, not a straight-on card portrait.",
    "Full body visible head to toe in every cell.",
    "",
    "FRAMING IN EACH CELL (identical geometry in every cell — matches **`renderCharacterWalkMockTileBuffer`** / `CHARACTER_WALK_FRAME_FEET_INSET_FROM_BOTTOM_PX` in **`gameDimensions.mjs`):",
    "**Horizontal:** center the character on the vertical midline (equal margin left and right).",
    "**Vertical:** the **top of the head** (hairline / crown) lies on the midline **10% of the cell height** **down** from the top edge (same as mock `hy0`).",
    "The **sole line** / **ground contact** between the feet lies **20% of the cell height above the bottom edge** of the cell (**W/4** foot clearance when the cell matches the pipeline — **not** 10%; **not** flush to the bottom edge).",
    "**Proportions (same ratios as mock):** head block ~**10/64** of cell width per side; torso ~**12/64** of cell width wide and ~**28%** of cell height tall; legs ~**5/64** of cell width thick and up to ~**32%** of cell height long — compact figure, not edge-to-edge.",
    "Scale the figure so these landmarks and proportions match; do not crop head or feet; keep limbs inside the cell.",
    "Strong clean silhouette against a plain solid flat-color background.",
    "",
    "BACKDROP AND EDGES (same policy as **`buildIsometricFloorStripSpritePrompt`** — avoid greenscreen / chroma artifacts):",
    "Do **not** describe chroma keys, greenscreen, matting, or any specific fluorescent backdrop color (no magenta/fuchsia/hot-pink vocabulary).",
    "The flat fill behind the figure is simply a calm neutral flat color; **no** halo, colored outline, glow, or pink/magenta/purple fringing along the character silhouette.",
    "",
    "SEAMS BETWEEN COLUMNS (critical for cropping):",
    "The strip is **one continuous image**, not four separate framed panels. That flat backdrop is **uniform** across each interior vertical boundary: **no** gutters, divider lines, hairline rules, pinstripes, contact-sheet borders, beveled grooves, inner shadows, embossing, or darker/lighter vertical bands trapped between columns.",
    "The backdrop must reach **fully** to the left and right edge of **every** cell, including along shared edges between neighbors — **no** narrow outline or halo that reads as a seam when the sheet is split into four crops.",
    "",
    "ANIMATION FLOW: The four cells read **strictly left to right** in a single row — one continuous walk loop.",
    "This is one continuous motion sequence. Each cell shows the next moment in the movement.",
    "The fourth cell must transition seamlessly back into the first for a looping cycle — no jumps, no resets.",
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
 * @param {{ layout?: 'grid' | 'strip' }} [opts]  **`strip`** — single horizontal row (1×N), **not** “one beat per row” of a square grid.
 * @returns {string}
 */
export function buildFalspriteSheetRewriteSystemPrompt(gridSize = 4, opts?: { layout?: "grid" | "strip" }): string {
  const w = FALSPRITE_NUM_WORDS[gridSize] ?? "four";
  const choreography =
    opts?.layout === "strip"
      ? `CHOREOGRAPHY: A ${w}-beat continuous animation loop that showcases this specific character's personality and abilities. Each beat is the next moment in the sequence, left to right in a single horizontal row. The last beat must transition seamlessly back into the first.`
      : `CHOREOGRAPHY: A ${w}-beat continuous animation loop that showcases this specific character's personality and abilities. Each beat is one row of the sheet. The last beat must transition seamlessly back into the first.`;
  return [
    "You are an animation director and character designer for a sprite sheet pipeline.",
    "Given a character concept, you MUST return exactly two sections, nothing else:",
    "",
    "CHARACTER: A vivid description of the character's appearance — body type, armor, weapons, colors, silhouette, art style. Be extremely specific and visual.",
    "",
    choreography,
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

/** Character walk (1×4 strip): OpenRouter system prompt aligned with falsprite — four beats in one horizontal row. */
export const CHARACTER_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT =
  buildFalspriteSheetRewriteSystemPrompt(4, { layout: "strip" });

/**
 * Replace `{tileSize}`, `{sheetSize}`, `{sheetWidth}`, `{sheetHeight}`, `{cellWidth}`, `{cellHeight}`, `{chromaKeyHex}` in a template string.
 * @param {string} template
 * @param {PromptCtx} ctx
 */
export function interpolatePromptTemplate(template: string, ctx: PromptCtx): string {
  let s = String(template);
  if (ctx.tileSize !== undefined) s = s.replaceAll("{tileSize}", String(ctx.tileSize));
  if (ctx.sheetSize !== undefined) s = s.replaceAll("{sheetSize}", String(ctx.sheetSize));
  if (ctx.sheetWidth !== undefined) s = s.replaceAll("{sheetWidth}", String(ctx.sheetWidth));
  if (ctx.sheetHeight !== undefined) s = s.replaceAll("{sheetHeight}", String(ctx.sheetHeight));
  if (ctx.cellWidth !== undefined) s = s.replaceAll("{cellWidth}", String(ctx.cellWidth));
  if (ctx.cellHeight !== undefined) s = s.replaceAll("{cellHeight}", String(ctx.cellHeight));
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
 * @param {number} [params.cellWidth] — with **`cellHeight`**, for rectangular tiles (e.g. isometric floor).
 * @param {number} [params.cellHeight]
 * @param {string} [params.suffix] — appended after subject; defaults to dpad frame suffix for parity with dpad-workflow
 */
export function buildPrompt(params: {
  tileSize: number;
  chromaKeyHex?: string;
  style: string;
  composition: string;
  subject: string;
  suffix?: string;
  cellWidth?: number;
  cellHeight?: number;
}): string {
  const {
    tileSize,
    chromaKeyHex,
    style,
    composition,
    subject,
    suffix = DPAD_FRAME_PROMPT_SUFFIX,
    cellWidth,
    cellHeight,
  } = params;
  const bg = chromaKeyHex || DEFAULT_CHROMA_KEY_HEX;
  const ctx: PromptCtx = { tileSize, chromaKeyHex: bg };
  if (cellWidth !== undefined) ctx.cellWidth = cellWidth;
  if (cellHeight !== undefined) ctx.cellHeight = cellHeight;
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
export function buildSheetPrompt(params: {
  sheetSize?: number;
  sheetWidth?: number;
  sheetHeight?: number;
  chromaKeyHex?: string;
  style: string;
  composition: string;
  subject: string;
}): string {
  const { sheetSize, sheetWidth, sheetHeight, chromaKeyHex, style, composition, subject } = params;
  const bg = chromaKeyHex || DEFAULT_CHROMA_KEY_HEX;
  const sw = sheetWidth ?? sheetSize;
  const sh = sheetHeight ?? sheetSize;
  if (sw === undefined || sh === undefined) {
    throw new Error("buildSheetPrompt: need sheetWidth+sheetHeight and/or sheetSize");
  }
  const ss = sheetSize ?? sw;
  const ctx: PromptCtx = {
    tileSize: ss,
    sheetSize: ss,
    sheetWidth: sw,
    sheetHeight: sh,
    chromaKeyHex: bg,
  };
  return interpolatePromptTemplate(style, ctx) + interpolatePromptTemplate(composition, ctx) + subject;
}
