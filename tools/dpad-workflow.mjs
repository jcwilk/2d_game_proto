#!/usr/bin/env node
/**
 * D-pad tile pipeline (hardcoded directions: up, down, left, right).
 *
 * Purpose
 * -------
 * Single entry point for the “predictable small raster” workflow we discussed:
 *   specs + manifest → one PNG per direction → deterministic QA (png-analyze).
 *   Optional: real generation via fal (FLUX.1 dev by default), with loud STDOUT so
 *   an agent (or human) can see what succeeded, what failed, and where time went.
 *
 * Modes
 * -----
 *   --mode mock      No network. Draws simple RGBA triangles (proves geometry + alpha
 *                    pipeline without T2I composition issues).
 *   --mode generate  fal + FAL_KEY. Default --strategy per-tile: four calls (same --seed,
 *                    PER_TILE_FAL_EXTRA_INPUT) + chromaKeyWithBorderFallback (#FF00FF then
 *                    border-median if FLUX misses exact hex). Use --strategy sheet for one
 *                    512² image + crop (shared style; quadrant→direction often wrong).
 *
 * Security
 * --------
 *   Reads FAL_KEY only from the environment (same as fal-raster-generate.mjs).
 *   Never prints the key; may print length and a masked suffix for debugging.
 *
 * @see tools/fal-raster-generate.mjs — lower-level fal CLI
 * @see tools/png-analyze.mjs — QA metrics written next to each PNG
 */

import { ApiError, fal } from "@fal-ai/client";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

// ---------------------------------------------------------------------------
// Constants (D-pad–specific; generalize later)
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");

/** Output root under public/ (Vite serves public/ at site root). */
const OUT_BASE = join(REPO_ROOT, "public", "art", "dpad");

/** Tile pixel size (width = height). Kept fixed for a predictable atlas later. */
const TILE_SIZE = 256;

/**
 * Single fal output for sheet strategy: 2×2 grid of tiles, sliced to TILE_SIZE each.
 * Must match crop map below.
 */
const SHEET_SIZE = 512;

/**
 * Where each direction lives in the 512×512 sheet (top-left origin).
 * Layout:
 *   [ up    ] [ right ]
 *   [ left  ] [ down  ]
 */
const SHEET_CROPS = {
  up: { x: 0, y: 0 },
  right: { x: TILE_SIZE, y: 0 },
  left: { x: 0, y: TILE_SIZE },
  down: { x: TILE_SIZE, y: TILE_SIZE },
};

/** fal endpoint: pinned to same model as tools/fal-raster-generate.mjs unless --endpoint overrides. */
const DEFAULT_FAL_ENDPOINT = "fal-ai/flux/dev";

/**
 * Extra fal input for sheet jobs (`FluxDevInput` in @fal-ai/client — no `negative_prompt` on flux/dev).
 * Positive-only main prompt avoids attention on forbidden nouns; `acceleration: "none"` prefers quality over speed.
 */
const SHEET_FAL_EXTRA_INPUT = {
  num_inference_steps: 40,
  guidance_scale: 4.5,
  acceleration: "none",
};

/** Same tuning for per-tile jobs (identical across the batch; paired with shared --seed). */
const PER_TILE_FAL_EXTRA_INPUT = SHEET_FAL_EXTRA_INPUT;

/**
 * Chroma-key screen color (flat background in prompt). Pixels within per-channel tolerance
 * become transparent; glyph should not use this RGB (see buildGenerationPrompt).
 */
const DEFAULT_CHROMA_KEY_HEX = "#FF00FF";
const DEFAULT_CHROMA_TOLERANCE = 42;
/** When the prompt hex misses FLUX drift, border-median key uses at least this tolerance. */
const CHROMA_FALLBACK_TOLERANCE_MIN = 52;

function parseHexRgb(hex) {
  const s = String(hex).trim();
  const m = /^#?([0-9a-fA-F]{6})$/.exec(s);
  if (!m) throw new Error(`invalid hex color: ${hex}`);
  const n = Number.parseInt(m[1], 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

/** Grid cell size for png-analyze (8×8 cells on 256²). */
const QA_SPRITE_W = 32;
const QA_SPRITE_H = 32;

const DIRECTIONS = /** @type {const} */ (["up", "down", "left", "right"]);

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  /** @type {{ mode: 'mock' | 'generate'; strategy: 'sheet' | 'per-tile'; endpoint: string; imageSize: string; seed?: number; keepSheet: boolean; skipQa: boolean; dryRun: boolean; quiet: boolean; help: boolean; chromaKeyHex: string; chromaTolerance: number }} */
  const opts = {
    mode: "mock",
    strategy: "per-tile",
    endpoint: DEFAULT_FAL_ENDPOINT,
    imageSize: `${TILE_SIZE}x${TILE_SIZE}`,
    keepSheet: false,
    skipQa: false,
    dryRun: false,
    quiet: false,
    help: false,
    chromaKeyHex: DEFAULT_CHROMA_KEY_HEX,
    chromaTolerance: DEFAULT_CHROMA_TOLERANCE,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`Missing value after ${a}`);
      return v;
    };
    switch (a) {
      case "--mode":
        opts.mode = /** @type {'mock'|'generate'} */ (next());
        if (opts.mode !== "mock" && opts.mode !== "generate") {
          throw new Error('--mode must be "mock" or "generate"');
        }
        break;
      case "--endpoint":
        opts.endpoint = next();
        break;
      case "--image-size":
        opts.imageSize = next();
        break;
      case "--strategy":
        opts.strategy = /** @type {'sheet'|'per-tile'} */ (next());
        if (opts.strategy !== "sheet" && opts.strategy !== "per-tile") {
          throw new Error('--strategy must be "sheet" or "per-tile"');
        }
        break;
      case "--keep-sheet":
        opts.keepSheet = true;
        break;
      case "--seed":
        opts.seed = Number.parseInt(next(), 10);
        if (Number.isNaN(opts.seed)) throw new Error("--seed must be an integer");
        break;
      case "--skip-qa":
        opts.skipQa = true;
        break;
      case "--dry-run":
        opts.dryRun = true;
        break;
      case "--quiet":
      case "-q":
        opts.quiet = true;
        break;
      case "--chroma-key": {
        const v = next();
        opts.chromaKeyHex = v;
        break;
      }
      case "--chroma-tolerance": {
        const v = Number.parseInt(next(), 10);
        if (Number.isNaN(v) || v < 0 || v > 255) {
          throw new Error("--chroma-tolerance must be an integer 0–255");
        }
        opts.chromaTolerance = v;
        break;
      }
      case "--help":
      case "-h":
        opts.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${a} (use --help)`);
    }
  }
  return opts;
}

function printHelp() {
  console.log(`Usage: node tools/dpad-workflow.mjs [options]

Hardcoded D-pad pipeline: manifest + four directional tiles + png-analyze QA.

Options:
  --mode mock|generate   mock = RGBA triangles (default, no API).
                         generate = fal (needs FAL_KEY); post chroma-key → RGBA tiles.
  --strategy sheet|per-tile   For generate only. Default: per-tile = four fal calls with the
                         SAME integer --seed and shared fal extras (reliable direction semantics).
                         sheet = ONE ${SHEET_SIZE}x${SHEET_SIZE} image + 2×2 crop (shared style;
                         quadrant→direction often wrong in practice).
  --keep-sheet           With --strategy sheet: also write public/art/dpad/sheet.png for debugging.
  --endpoint <id>        fal model id (default: ${DEFAULT_FAL_ENDPOINT})
  --image-size <WxH>     per-tile: passed to fal per tile (default: ${TILE_SIZE}x${TILE_SIZE}).
                         Ignored for sheet (sheet is always ${SHEET_SIZE}x${SHEET_SIZE}).
  --seed <int>           Optional fal seed: one job (sheet) or the SAME seed every per-tile call.
  --chroma-key <#RRGGBB>  Screen color in prompts + post removal (default: ${DEFAULT_CHROMA_KEY_HEX}).
  --chroma-tolerance <0-255>  Per-channel RGB distance for key match (default: ${DEFAULT_CHROMA_TOLERANCE}).
  --skip-qa              Skip png-analyze step.
  --dry-run              Print planned actions only; no writes, no API calls.
                         For --mode generate, does NOT require FAL_KEY (planning only).
  --quiet, -q            Less STDOUT (errors still print).
  --help, -h             This message.

Environment (generate mode):
  FAL_KEY or FAL_KEY_ID + FAL_KEY_SECRET

Examples:
  node tools/dpad-workflow.mjs --mode mock
  node --env-file=.env tools/dpad-workflow.mjs --mode generate
  node --env-file=.env tools/dpad-workflow.mjs --mode generate --strategy sheet --keep-sheet
`);
}

// ---------------------------------------------------------------------------
// Logging — verbose by default for agent visibility
// ---------------------------------------------------------------------------

/**
 * @param {'DEBUG'|'INFO'|'WARN'|'ERROR'} level
 * @param {string} step  Short phase id, e.g. "init", "fal:up", "qa"
 * @param {string} message
 * @param {Record<string, unknown>} [extra]  Optional structured fields (JSON-serializable)
 */
function log(level, step, message, extra) {
  const ts = new Date().toISOString();
  const base = `[${ts}] [dpad-workflow] [${level}] [${step}] ${message}`;
  if (extra && Object.keys(extra).length > 0) {
    console.log(base, "|", JSON.stringify(extra));
  } else {
    console.log(base);
  }
}

/** Describe a secret for logs without leaking it. */
function maskSecret(s) {
  const t = String(s).trim();
  if (t.length <= 8) return "(length<=8, hidden)";
  return `len=${t.length} suffix=...${t.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// fal helpers (aligned with tools/fal-raster-generate.mjs)
// ---------------------------------------------------------------------------

function resolveFalCredentials() {
  const direct = process.env.FAL_KEY;
  if (direct !== undefined && String(direct).trim() !== "") {
    return String(direct).trim();
  }
  const id = process.env.FAL_KEY_ID;
  const secret = process.env.FAL_KEY_SECRET;
  if (id && secret && String(id).trim() && String(secret).trim()) {
    return `${String(id).trim()}:${String(secret).trim()}`;
  }
  return undefined;
}

/**
 * @param {unknown} err
 */
function formatFalClientError(err) {
  if (err instanceof ApiError) {
    const body = err.body;
    if (body && typeof body === "object") {
      const detail = "detail" in body ? body.detail : undefined;
      const msg = "message" in body ? body.message : undefined;
      const line = typeof detail === "string" ? detail : typeof msg === "string" ? msg : undefined;
      if (line) {
        return `${err.message} (${line})`;
      }
    }
    if (err.requestId) {
      return `${err.message} (request id: ${err.requestId})`;
    }
  }
  return err instanceof Error ? err.message : String(err);
}

/**
 * @param {string} s
 * @returns {{ width: number; height: number } | string}
 */
function parseImageSize(s) {
  const m = /^(\d+)x(\d+)$/.exec(s.trim());
  if (m) {
    return { width: Number(m[1]), height: Number(m[2]) };
  }
  return s;
}

async function downloadToBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download image: HTTP ${res.status} ${res.statusText}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function downloadToFile(url, destPath) {
  const buf = await downloadToBuffer(url);
  await writeFile(destPath, buf);
}

// ---------------------------------------------------------------------------
// Prompts — T2I priors strongly favor “whole D-pad”; negatives help only a bit.
// ---------------------------------------------------------------------------

/**
 * Direction-specific layout hint so FLUX does not default every triangle to “up”.
 * Same sentence slot for all directions (template parity).
 *
 * @param {'up'|'down'|'left'|'right'} direction
 */
function directionLayoutHint(direction) {
  switch (direction) {
    case "up":
      return (
        `Flat 2D only: a single filled upward-pointing arrowhead (isosceles triangle), orthographic, no perspective. ` +
        `Apex at top-center flush with the top edge; horizontal base below. No cube, pyramid, prism, or 3D extrusion.`
      );
    case "down":
      return (
        `Flat 2D only: a single filled downward-pointing arrowhead (isosceles triangle), orthographic, no perspective. ` +
        `Apex at bottom-center flush with the bottom edge; horizontal base above. No cube, pyramid, prism, or 3D extrusion.`
      );
    case "left":
      return (
        `Flat 2D only: WEST-facing horizontal arrow: the triangle is wide left-to-right (its “height” is small, “width” is large); ` +
        `the tip is on the LEFT edge at vertical center; the base is a vertical segment on the RIGHT — reads as LEFT, not up and not down. ` +
        `Do not draw a vertical arrow or a downward-pointing chevron. ` +
        `Orthographic, no perspective. No cube, pyramid, prism, or 3D extrusion.`
      );
    case "right":
      return (
        `Flat 2D only: EAST-facing arrow: a single filled arrowhead pointing RIGHT (toward the right side of the canvas). ` +
        `The tip touches the RIGHT edge at right-center; the wide base is on the LEFT half. Must NOT point left or up. ` +
        `Orthographic, no perspective. No cube, pyramid, prism, or 3D extrusion.`
      );
    default:
      throw new Error(String(direction));
  }
}

/**
 * Build a direction-specific prompt. Template is identical across directions except
 * the direction block — pairs with shared seed + PER_TILE_FAL_EXTRA_INPUT for style lock.
 *
 * @param {'up'|'down'|'left'|'right'} direction
 * @param {string} chromaKeyHex e.g. "#FF00FF" — must match post chroma-key removal
 */
function buildGenerationPrompt(direction, chromaKeyHex) {
  const bg = chromaKeyHex || DEFAULT_CHROMA_KEY_HEX;
  const layout = directionLayoutHint(direction);
  return (
    `Flat ${TILE_SIZE}px square pixel art. ` +
    `The entire background is one flat solid screen color ${bg} (pure magenta), full bleed, no gradients, no vignette. ` +
    `Exactly one filled triangle with three straight sides, a single solid flat color that is NOT ${bg} (e.g. dark gray or navy). ` +
    layout +
    ` The shape is optically centered as a whole (equal margin to the canvas edges). ` +
    `Crisp edges, no soft glow, no gradients inside the shape, no shading, no lighting. No other shapes, no text, no frames, no shadows, no hardware, no grid lines.`
  );
}

/**
 * One fal job covering all four directions in a fixed 2×2 layout — shared latent/style.
 * Cropping is deterministic in code (see SHEET_CROPS).
 * Empirically: strong style lock; FLUX may repeat the same triangle rotation in every cell.
 * For reliable per-direction glyphs, prefer `--strategy per-tile` + `buildGenerationPrompt`.
 * @param {string} chromaKeyHex
 */
function buildSheetPrompt(chromaKeyHex) {
  const bg = chromaKeyHex || DEFAULT_CHROMA_KEY_HEX;
  return (
    `2x2 pixel art contact sheet on one ${SHEET_SIZE}px canvas: four equal panels. ` +
    `Entire image background is one flat solid screen color ${bg} (pure magenta), full bleed, no gradients. ` +
    `One solid filled triangle per panel (same triangle ink color everywhere, not ${bg}); triangles small, optically centered in each panel, generous margin; no text, no shadows, no hardware, no pinwheel. ` +
    `Walk clockwise from top-left: ` +
    `(1) top-left points up, (2) top-right points right, (3) bottom-right points down, (4) bottom-left points left. ` +
    `Each step the triangle rotates 90 degrees from the previous panel — four distinct orientations, not four copies of the same rotation.`
  );
}

// ---------------------------------------------------------------------------
// Mock raster (RGBA triangles)
// ---------------------------------------------------------------------------

function pointInTriangle(p, a, b, c) {
  const sign = (p1, p2, p3) =>
    (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  const d1 = sign(p, a, b);
  const d2 = sign(p, b, c);
  const d3 = sign(p, c, a);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

/**
 * @param {'up'|'down'|'left'|'right'} dir
 */
function triangleForDirection(dir) {
  const m = 32;
  const cx = TILE_SIZE / 2;
  const cy = TILE_SIZE / 2;
  switch (dir) {
    case "up":
      return [
        { x: cx, y: m },
        { x: m, y: TILE_SIZE - m },
        { x: TILE_SIZE - m, y: TILE_SIZE - m },
      ];
    case "down":
      return [
        { x: m, y: m },
        { x: TILE_SIZE - m, y: m },
        { x: cx, y: TILE_SIZE - m },
      ];
    case "left":
      return [
        { x: m, y: cy },
        { x: TILE_SIZE - m, y: m },
        { x: TILE_SIZE - m, y: TILE_SIZE - m },
      ];
    case "right":
      return [
        { x: TILE_SIZE - m, y: cy },
        { x: m, y: m },
        { x: m, y: TILE_SIZE - m },
      ];
    default:
      throw new Error(String(dir));
  }
}

/**
 * @param {'up'|'down'|'left'|'right'} dir
 */
function renderMockPng(dir) {
  const [a, b, c] = triangleForDirection(dir);
  const png = new PNG({ width: TILE_SIZE, height: TILE_SIZE, colorType: 6 });
  const fill = { r: 0x5a, g: 0x6f, b: 0x9e, a: 0xff };
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const i = (TILE_SIZE * y + x) << 2;
      const p = { x, y };
      if (pointInTriangle(p, a, b, c)) {
        png.data[i] = fill.r;
        png.data[i + 1] = fill.g;
        png.data[i + 2] = fill.b;
        png.data[i + 3] = fill.a;
      } else {
        png.data[i] = 0;
        png.data[i + 1] = 0;
        png.data[i + 2] = 0;
        png.data[i + 3] = 0;
      }
    }
  }
  return PNG.sync.write(png);
}

// ---------------------------------------------------------------------------
// fal: shared subscribe → buffer
// ---------------------------------------------------------------------------

/**
 * @param {import('pngjs').PNG} src
 * @param {number} x0
 * @param {number} y0
 * @param {number} w
 * @param {number} h
 */
function extractPngRegion(src, x0, y0, w, h) {
  if (x0 + w > src.width || y0 + h > src.height) {
    throw new Error(`crop out of bounds: ${x0},${y0} ${w}x${h} vs ${src.width}x${src.height}`);
  }
  const dst = new PNG({ width: w, height: h, colorType: src.colorType });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = x0 + x;
      const sy = y0 + y;
      const si = (src.width * sy + sx) << 2;
      const di = (w * y + x) << 2;
      dst.data[di] = src.data[si];
      dst.data[di + 1] = src.data[si + 1];
      dst.data[di + 2] = src.data[si + 2];
      dst.data[di + 3] = src.data[si + 3];
    }
  }
  return PNG.sync.write(dst);
}

/**
 * @param {import('pngjs').PNG} png
 */
function inferBackgroundKeyFromBorder(png) {
  const w = png.width;
  const h = png.height;
  const rs = [];
  const gs = [];
  const bs = [];
  const push = (x, y) => {
    const i = (w * y + x) << 2;
    rs.push(png.data[i]);
    gs.push(png.data[i + 1]);
    bs.push(png.data[i + 2]);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    push(0, y);
    push(w - 1, y);
  }
  const median = (arr) => {
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  return { r: median(rs), g: median(gs), b: median(bs) };
}

/**
 * @param {Buffer} pngBuffer
 */
function countFullyTransparentPercent(pngBuffer) {
  const png = PNG.sync.read(pngBuffer);
  let transparent = 0;
  const n = png.width * png.height;
  for (let i = 3; i < png.data.length; i += 4) {
    if (png.data[i] === 0) transparent++;
  }
  return (transparent / n) * 100;
}

/**
 * Deterministic chroma-key: pixels within per-channel RGB tolerance of `keyRgb` → alpha 0;
 * other pixels → opaque RGBA (glyph for HUD overlay).
 *
 * @param {Buffer} pngBuffer
 * @param {{ keyRgb: { r: number; g: number; b: number }; tolerance: number }} opts
 * @returns {Buffer}
 */
function applyChromaKeyToPngBuffer(pngBuffer, opts) {
  const { keyRgb, tolerance } = opts;
  const png = PNG.sync.read(pngBuffer);
  const out = new PNG({ width: png.width, height: png.height, colorType: 6 });
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i];
    const g = png.data[i + 1];
    const b = png.data[i + 2];
    const dr = Math.abs(r - keyRgb.r);
    const dg = Math.abs(g - keyRgb.g);
    const db = Math.abs(b - keyRgb.b);
    const match = dr <= tolerance && dg <= tolerance && db <= tolerance;
    if (match) {
      out.data[i] = 0;
      out.data[i + 1] = 0;
      out.data[i + 2] = 0;
      out.data[i + 3] = 0;
    } else {
      out.data[i] = r;
      out.data[i + 1] = g;
      out.data[i + 2] = b;
      out.data[i + 3] = 255;
    }
  }
  return PNG.sync.write(out);
}

/**
 * FLUX often drifts from the exact prompt hex; if the primary key removes almost nothing,
 * use median border color as the key (valid when the glyph is inset from edges).
 *
 * @param {Buffer} rawFalPng
 * @param {{ keyRgb: { r: number; g: number; b: number }; tolerance: number; fallbackTolerance: number }} opts
 * @returns {{ buffer: Buffer; usedPrimaryKey: boolean; keyRgb: { r: number; g: number; b: number } }}
 */
function chromaKeyWithBorderFallback(rawFalPng, opts) {
  const { keyRgb, tolerance, fallbackTolerance } = opts;
  let buf = applyChromaKeyToPngBuffer(rawFalPng, { keyRgb, tolerance });
  let usedPrimaryKey = true;
  let effectiveKey = keyRgb;
  const pct = countFullyTransparentPercent(buf);
  if (pct < 0.8) {
    const png = PNG.sync.read(rawFalPng);
    const inferred = inferBackgroundKeyFromBorder(png);
    buf = applyChromaKeyToPngBuffer(rawFalPng, { keyRgb: inferred, tolerance: fallbackTolerance });
    usedPrimaryKey = false;
    effectiveKey = inferred;
    log("WARN", "chroma", "primary hex key removed <0.8% pixels; using border-median key", {
      inferred,
      transparentPercentAfter: countFullyTransparentPercent(buf).toFixed(2),
    });
  }
  return { buffer: buf, usedPrimaryKey, keyRgb: effectiveKey };
}

/**
 * @param {object} params
 * @param {string} params.endpoint
 * @param {string} params.prompt
 * @param {string} params.imageSize
 * @param {number|undefined} params.seed
 * @param {boolean} params.quiet
 * @param {Record<string, unknown>|undefined} params.falExtraInput  Merged into fal input (e.g. guidance_scale).
 * @returns {Promise<{ buffer: Buffer; seed?: number; wallMs: number }>}
 */
async function falSubscribeToBuffer(params) {
  const { endpoint, prompt, imageSize, seed, quiet, falExtraInput } = params;

  const image_size = parseImageSize(imageSize);
  const input = {
    prompt,
    image_size,
    num_images: 1,
    output_format: "png",
    ...(falExtraInput && typeof falExtraInput === "object" ? falExtraInput : {}),
  };
  if (seed !== undefined) {
    input.seed = seed;
  }

  log("INFO", `fal:${endpoint}`, "subscribe() starting", {
    image_size: typeof image_size === "string" ? image_size : image_size,
    seed: input.seed ?? null,
    promptChars: prompt.length,
  });
  if (!quiet) {
    log("DEBUG", "fal:prompt", "full prompt follows");
    console.log(prompt);
  }

  const t0 = Date.now();
  let lastStatus = "";

  const result = await fal.subscribe(endpoint, {
    input,
    logs: true,
    onQueueUpdate: (status) => {
      const s = status && typeof status === "object" && "status" in status ? String(status.status) : "?";
      if (s !== lastStatus) {
        lastStatus = s;
        log("DEBUG", "fal:queue", `status=${s}`, {
          ...(typeof status === "object" && status !== null && "position" in status
            ? { position: status.position }
            : {}),
        });
      }
    },
  });

  const wallMs = Date.now() - t0;
  const data = result.data;
  if (!data || !Array.isArray(data.images) || data.images.length === 0) {
    throw new Error("fal returned no images in response data");
  }

  const img0 = data.images[0];
  if (!img0 || typeof img0.url !== "string") {
    throw new Error("fal image[0] missing url");
  }

  log("INFO", `fal:${endpoint}`, "download starting", { urlHost: img0.url ? new URL(img0.url).host : "?" });
  const buffer = await downloadToBuffer(img0.url);

  const outSeed = data.seed;
  log("INFO", `fal:${endpoint}`, "subscribe() done", {
    wallMs,
    seedReturned: outSeed,
    bytes: buffer.length,
  });

  return { buffer, seed: outSeed, wallMs };
}

// ---------------------------------------------------------------------------
// QA: png-analyze
// ---------------------------------------------------------------------------

function runPngAnalyze(absPngPath, absJsonOut, quiet) {
  const pngAnalyze = join(REPO_ROOT, "tools", "png-analyze.mjs");
  log("INFO", "qa:png-analyze", "running", {
    png: absPngPath,
    sprite: `${QA_SPRITE_W}x${QA_SPRITE_H}`,
  });
  const t0 = Date.now();
  const out = execFileSync(process.execPath, [pngAnalyze, absPngPath, "--sprite-width", String(QA_SPRITE_W), "--sprite-height", String(QA_SPRITE_H)], {
    encoding: "utf8",
  });
  const ms = Date.now() - t0;
  writeFileSync(absJsonOut, out, "utf8");
  let summary = {};
  try {
    const j = JSON.parse(out);
    summary = {
      width: j.dimensions?.width,
      height: j.dimensions?.height,
      fullyOpaquePercent: j.alpha?.fullyOpaquePercent,
      fullyTransparentPercent: j.alpha?.fullyTransparentPercent,
      gridDivisible: j.grid?.divisible,
    };
  } catch {
    summary = { parseError: true };
  }
  log("INFO", "qa:png-analyze", `finished in ${ms}ms`, summary);
  if (!quiet) {
    log("DEBUG", "qa:png-analyze", "full JSON written to sidecar file");
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv);
  } catch (e) {
    console.error(`error: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  if (opts.mode === "generate") {
    try {
      parseHexRgb(opts.chromaKeyHex);
    } catch (e) {
      console.error(`error: invalid --chroma-key: ${e instanceof Error ? e.message : e}`);
      process.exit(1);
    }
  }

  const quiet = opts.quiet;
  const recipeId =
    opts.mode === "mock"
      ? "dpad-workflow-mock-v1"
      : opts.strategy === "sheet"
        ? "dpad-workflow-fal-sheet-v12-chroma"
        : "dpad-workflow-fal-per-tile-v3-chroma";

  log("INFO", "init", "starting", {
    mode: opts.mode,
    strategy: opts.mode === "generate" ? opts.strategy : null,
    outBase: OUT_BASE,
    recipeId,
    dryRun: opts.dryRun,
    endpoint: opts.mode === "generate" ? opts.endpoint : null,
  });

  // dry-run before credentials: lets agents inspect a generate plan without FAL_KEY in env.
  if (opts.dryRun) {
    log("WARN", "dry-run", "no files, no API calls; listing planned actions only");
    for (const d of DIRECTIONS) {
      log("INFO", "dry-run", `would write ${join("public/art/dpad", d, "dpad.png")}`);
    }
    if (opts.mode === "generate") {
      if (opts.strategy === "sheet") {
        log("INFO", "dry-run", "would call fal.subscribe ONCE", {
          endpoint: opts.endpoint,
          imageSize: `${SHEET_SIZE}x${SHEET_SIZE}`,
          seed: opts.seed ?? null,
          keepSheet: opts.keepSheet,
        });
        log("DEBUG", "dry-run", "sheet prompt preview", { text: buildSheetPrompt(opts.chromaKeyHex).slice(0, 200) + "…" });
        log("INFO", "dry-run", "would crop quadrants per SHEET_CROPS (up,right,left,down)");
      } else {
        log("INFO", "dry-run", "would call fal.subscribe once per direction (per-tile)", {
          endpoint: opts.endpoint,
          imageSize: opts.imageSize,
          seed: opts.seed ?? null,
        });
        for (const d of DIRECTIONS) {
          log("DEBUG", "dry-run", `prompt preview [${d}]`, {
            text: buildGenerationPrompt(d, opts.chromaKeyHex).slice(0, 120) + "…",
          });
        }
      }
    }
    log("INFO", "dry-run", "done");
    process.exit(0);
  }

  if (opts.mode === "generate") {
    const cred = resolveFalCredentials();
    if (!cred) {
      log("ERROR", "credentials", "FAL_KEY (or FAL_KEY_ID + FAL_KEY_SECRET) missing — cannot use --mode generate");
      process.exit(2);
    }
    log("INFO", "credentials", "fal API key present", { key: maskSecret(cred) });
    fal.config({ credentials: cred });
  } else {
    log("INFO", "credentials", "skipping fal (mock mode)");
  }

  const createdAt = new Date().toISOString();
  const timings = /** @type {Record<string, number>} */ ({});
  const generationResults = /** @type {Record<string, { seed?: number; wallMs?: number; error?: string }>} */ ({});

  await mkdir(OUT_BASE, { recursive: true });

  const keyRgbForManifest = opts.mode === "generate" ? parseHexRgb(opts.chromaKeyHex) : null;

  const recipeNote =
    opts.mode === "mock"
      ? "Mock: geometry from pngjs triangles, not T2I."
      : opts.strategy === "sheet"
        ? `Real: one fal job at ${SHEET_SIZE}x${SHEET_SIZE}, crop to ${TILE_SIZE}px, then chroma-key (${opts.chromaKeyHex}) → RGBA.`
        : `Real: one fal.subscribe per direction with identical prompt template + PER_TILE_FAL_EXTRA_INPUT; same integer --seed for every call in the batch when set; chroma-key (${opts.chromaKeyHex}) → RGBA after each download.`;

  // --- Manifest (written before tiles so partial runs still leave a trace)
  const manifest = {
    kind: "dpad_tile_set",
    recipeId,
    createdAt,
    workflow:
      opts.mode === "mock"
        ? "mock (triangles)"
        : opts.strategy === "sheet"
          ? `fal sheet (${opts.endpoint}, ${SHEET_SIZE}px → crop)`
          : `fal per-tile (${opts.endpoint})`,
    specs: {
      tileSize: { width: TILE_SIZE, height: TILE_SIZE },
      ...(opts.mode === "generate" && opts.strategy === "sheet"
        ? { sheetSize: { width: SHEET_SIZE, height: SHEET_SIZE }, sheetCropMap: SHEET_CROPS }
        : {}),
      imageSize:
        opts.mode === "generate" && opts.strategy === "sheet"
          ? `${SHEET_SIZE}x${SHEET_SIZE}`
          : opts.imageSize,
      naming: "dpad.png per direction folder",
      directions: [...DIRECTIONS],
      ...(opts.mode === "generate" ? { strategy: opts.strategy } : {}),
      ...(opts.mode === "generate" && keyRgbForManifest
        ? {
            chroma: {
              keyHex: opts.chromaKeyHex,
              keyRgb: keyRgbForManifest,
              tolerance: opts.chromaTolerance,
              postProcess:
                "chromaKeyWithBorderFallback: prompt hex first; if <0.8% transparent, median 1px border RGB + higher tolerance",
            },
            seedPolicyPerTile:
              opts.strategy === "per-tile"
                ? "Same integer --seed passed to every fal.subscribe in this batch when --seed is set."
                : null,
          }
        : {}),
    },
    generationRecipe: {
      mode: opts.mode,
      endpoint: opts.mode === "generate" ? opts.endpoint : null,
      seedRequested: opts.seed ?? null,
      falExtrasPerTile: opts.mode === "generate" && opts.strategy === "per-tile" ? PER_TILE_FAL_EXTRA_INPUT : null,
      falExtrasSheet: opts.mode === "generate" && opts.strategy === "sheet" ? SHEET_FAL_EXTRA_INPUT : null,
      note: recipeNote,
    },
    provenance: {
      tool: "tools/dpad-workflow.mjs",
      version: 2,
    },
    generationResults,
  };

  const manifestPath = join(OUT_BASE, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  log("INFO", "manifest", `wrote ${manifestPath}`);

  // --- Tiles
  if (opts.mode === "mock") {
    for (const dir of DIRECTIONS) {
      const folder = join(OUT_BASE, dir);
      await mkdir(folder, { recursive: true });
      const outPng = join(folder, "dpad.png");
      log("INFO", `tile:${dir}`, "begin", { outPng: join("public/art/dpad", dir, "dpad.png") });
      try {
        const t0 = Date.now();
        const buf = renderMockPng(dir);
        timings[dir] = Date.now() - t0;
        await writeFile(outPng, buf);
        generationResults[dir] = { wallMs: timings[dir], seed: undefined };
        log("INFO", `tile:${dir}`, "mock PNG written", { bytes: buf.length, wallMs: timings[dir] });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        generationResults[dir] = { error: msg };
        log("ERROR", `tile:${dir}`, "FAILED", { error: msg });
        manifest.generationResults = generationResults;
        await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
        process.exit(1);
      }
    }
  } else if (opts.strategy === "sheet") {
    for (const dir of DIRECTIONS) {
      await mkdir(join(OUT_BASE, dir), { recursive: true });
    }
    try {
      const prompt = buildSheetPrompt(opts.chromaKeyHex);
      const keyRgb = parseHexRgb(opts.chromaKeyHex);
      log("INFO", "sheet", "single fal job + crop + chroma (shared style)", { sheetPx: SHEET_SIZE });
      const { buffer, seed, wallMs } = await falSubscribeToBuffer({
        endpoint: opts.endpoint,
        prompt,
        imageSize: `${SHEET_SIZE}x${SHEET_SIZE}`,
        seed: opts.seed,
        quiet,
        falExtraInput: opts.endpoint === DEFAULT_FAL_ENDPOINT ? SHEET_FAL_EXTRA_INPUT : undefined,
      });
      timings.sheetFal = wallMs;
      if (opts.keepSheet) {
        await writeFile(join(OUT_BASE, "sheet.png"), buffer);
        log("INFO", "sheet", "wrote public/art/dpad/sheet.png (--keep-sheet, pre-chroma)");
      }
      const png = PNG.sync.read(buffer);
      if (png.width !== SHEET_SIZE || png.height !== SHEET_SIZE) {
        throw new Error(`expected fal output ${SHEET_SIZE}x${SHEET_SIZE}, got ${png.width}x${png.height}`);
      }
      for (const dir of DIRECTIONS) {
        const { x, y } = SHEET_CROPS[dir];
        const tileBufRaw = extractPngRegion(png, x, y, TILE_SIZE, TILE_SIZE);
        const { buffer: tileBuf, usedPrimaryKey } = chromaKeyWithBorderFallback(tileBufRaw, {
          keyRgb,
          tolerance: opts.chromaTolerance,
          fallbackTolerance: Math.max(opts.chromaTolerance, CHROMA_FALLBACK_TOLERANCE_MIN),
        });
        await writeFile(join(OUT_BASE, dir, "dpad.png"), tileBuf);
        generationResults[dir] = {
          seed,
          wallMs,
          fromSheet: true,
          cropOrigin: `${x},${y}`,
          chromaApplied: true,
          chromaKeySource: usedPrimaryKey ? "prompt-hex" : "border-median",
        };
        log("INFO", `tile:${dir}`, "cropped from sheet + chroma", { cropOrigin: `${x},${y}`, bytes: tileBuf.length });
      }
      generationResults._sheet = { seed, wallMs, strategy: "sheet" };
    } catch (e) {
      const msg = formatFalClientError(e);
      log("ERROR", "sheet", "FAILED", { error: msg });
      generationResults._sheet = { error: msg };
      manifest.generationResults = generationResults;
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
      process.exit(1);
    }
  } else {
    for (const dir of DIRECTIONS) {
      const folder = join(OUT_BASE, dir);
      await mkdir(folder, { recursive: true });
      const outPng = join(folder, "dpad.png");
      log("INFO", `tile:${dir}`, "begin", { outPng: join("public/art/dpad", dir, "dpad.png") });
      try {
        const prompt = buildGenerationPrompt(dir, opts.chromaKeyHex);
        const keyRgb = parseHexRgb(opts.chromaKeyHex);
        const t0 = Date.now();
        const { buffer, seed, wallMs } = await falSubscribeToBuffer({
          endpoint: opts.endpoint,
          prompt,
          imageSize: opts.imageSize,
          seed: opts.seed,
          quiet,
          falExtraInput: opts.endpoint === DEFAULT_FAL_ENDPOINT ? PER_TILE_FAL_EXTRA_INPUT : undefined,
        });
        const { buffer: outBuf, usedPrimaryKey } = chromaKeyWithBorderFallback(buffer, {
          keyRgb,
          tolerance: opts.chromaTolerance,
          fallbackTolerance: Math.max(opts.chromaTolerance, CHROMA_FALLBACK_TOLERANCE_MIN),
        });
        await writeFile(outPng, outBuf);
        timings[dir] = Date.now() - t0;
        generationResults[dir] = {
          seed,
          wallMs,
          chromaApplied: true,
          seedRequested: opts.seed ?? null,
          chromaKeySource: usedPrimaryKey ? "prompt-hex" : "border-median",
        };
        log("INFO", `tile:${dir}`, "fal PNG + chroma saved", generationResults[dir]);
      } catch (e) {
        const msg = formatFalClientError(e);
        generationResults[dir] = { error: msg };
        log("ERROR", `tile:${dir}`, "FAILED", { error: msg });
        manifest.generationResults = generationResults;
        await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
        log("WARN", "manifest", "updated after failure (partial state)");
        process.exit(1);
      }
    }
  }

  // Refresh manifest with timings
  manifest.generationResults = generationResults;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  log("INFO", "manifest", "finalized with generationResults");

  // --- QA
  if (!opts.skipQa) {
    for (const dir of DIRECTIONS) {
      if (generationResults[dir]?.error) continue;
      const rel = join("public/art/dpad", dir, "dpad.png");
      const abs = join(REPO_ROOT, rel);
      const jsonPath = join(OUT_BASE, dir, "png-analyze.json");
      try {
        runPngAnalyze(abs, jsonPath, quiet);
      } catch (e) {
        log("ERROR", `qa:${dir}`, "png-analyze failed", { error: e instanceof Error ? e.message : String(e) });
        process.exit(1);
      }
    }
  } else {
    log("WARN", "qa", "skipped (--skip-qa)");
  }

  log("INFO", "summary", "workflow complete", {
    mode: opts.mode,
    directions: DIRECTIONS.length,
    timingsMs: timings,
    totalWallMsApprox: Object.values(timings).reduce((a, b) => a + b, 0),
  });
  log("INFO", "summary", "next steps for humans/agents", {
    check: "Open public/art/dpad/*/dpad.png and manifest.json",
    qa: opts.skipQa ? "QA skipped" : "See png-analyze.json per direction",
    engine: "Wire paths in Excalibur/HTML when ready",
  });
}

main().catch((e) => {
  const msg = e instanceof ApiError ? formatFalClientError(e) : e instanceof Error ? e.message : String(e);
  log("ERROR", "fatal", msg, { stack: e instanceof Error ? e.stack : undefined });
  process.exit(1);
});
