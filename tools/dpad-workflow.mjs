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
 *   --mode generate  Calls fal subscribe() once per direction. Requires FAL_KEY.
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

/** fal endpoint: pinned to same model as tools/fal-raster-generate.mjs unless --endpoint overrides. */
const DEFAULT_FAL_ENDPOINT = "fal-ai/flux/dev";

/** Grid cell size for png-analyze (8×8 cells on 256²). */
const QA_SPRITE_W = 32;
const QA_SPRITE_H = 32;

const DIRECTIONS = /** @type {const} */ (["up", "down", "left", "right"]);

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  /** @type {{ mode: 'mock' | 'generate'; endpoint: string; imageSize: string; seed?: number; skipQa: boolean; dryRun: boolean; quiet: boolean; help: boolean }} */
  const opts = {
    mode: "mock",
    endpoint: DEFAULT_FAL_ENDPOINT,
    imageSize: `${TILE_SIZE}x${TILE_SIZE}`,
    skipQa: false,
    dryRun: false,
    quiet: false,
    help: false,
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
                         generate = fal text-to-image per direction (needs FAL_KEY).
  --endpoint <id>        fal model id (default: ${DEFAULT_FAL_ENDPOINT})
  --image-size <WxH>     Passed to fal as image_size (default: ${TILE_SIZE}x${TILE_SIZE})
  --seed <int>           Optional; passed to fal for each direction (repro experiments).
  --skip-qa              Skip png-analyze step.
  --dry-run              Print planned actions only; no writes, no API calls.
                         For --mode generate, does NOT require FAL_KEY (planning only).
  --quiet, -q            Less STDOUT (errors still print).
  --help, -h             This message.

Environment (generate mode):
  FAL_KEY or FAL_KEY_ID + FAL_KEY_SECRET

Examples:
  node tools/dpad-workflow.mjs --mode mock
  node --env-file=.env node tools/dpad-workflow.mjs --mode generate
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

async function downloadToFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download image: HTTP ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(destPath, buf);
}

// ---------------------------------------------------------------------------
// Prompts — T2I priors strongly favor “whole D-pad”; negatives help only a bit.
// ---------------------------------------------------------------------------

/**
 * Build a direction-specific prompt. Keep structure identical across directions
 * except for the direction word — helps when comparing seeds across siblings.
 *
 * @param {'up'|'down'|'left'|'right'} direction
 */
function buildGenerationPrompt(direction) {
  const negatives =
    "full d-pad, four directions, game controller, gamepad, A B X Y buttons, analog sticks, cables, hands, text, watermark, border, frame, drop shadow, 3d render.";
  return (
    `Orthographic top-down pixel art UI tile: ONLY the ${direction} segment of a single directional control (one wedge or arrow pointing ${direction}). ` +
    `Centered, fills the frame edge-to-edge, flat solid colors, no gradients, no other buttons, no controller body, HUD game UI element, crisp pixel edges, 16-bit style. ` +
    `Negative: ${negatives}`
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
// fal: one direction
// ---------------------------------------------------------------------------

/**
 * @param {object} params
 * @param {string} params.endpoint
 * @param {string} params.prompt
 * @param {string} params.imageSize
 * @param {string} params.outFile
 * @param {number|'omit'} [params.seed]
 * @param {boolean} params.quiet
 * @returns {Promise<{ seed?: number; requestId?: string; wallMs: number }>}
 */
async function generateOneWithFal(params) {
  const { endpoint, prompt, imageSize, outFile, quiet } = params;
  const seed = params.seed;

  const image_size = parseImageSize(imageSize);
  const input = {
    prompt,
    image_size,
    num_images: 1,
    output_format: "png",
  };
  if (seed !== undefined && seed !== "omit") {
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
  await downloadToFile(img0.url, outFile);

  const outSeed = data.seed;
  log("INFO", `fal:${endpoint}`, "subscribe() done", {
    wallMs,
    seedReturned: outSeed,
    bytesWrittenPath: outFile,
  });

  return { seed: outSeed, wallMs };
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

  const quiet = opts.quiet;
  const recipeId = opts.mode === "mock" ? "dpad-workflow-mock-v1" : "dpad-workflow-fal-v1";

  log("INFO", "init", "starting", {
    mode: opts.mode,
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
      log("INFO", "dry-run", "would call fal.subscribe once per direction", {
        endpoint: opts.endpoint,
        imageSize: opts.imageSize,
        seed: opts.seed ?? null,
      });
      for (const d of DIRECTIONS) {
        log("DEBUG", "dry-run", `prompt preview [${d}]`, { text: buildGenerationPrompt(d).slice(0, 120) + "…" });
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

  // --- Manifest (written before tiles so partial runs still leave a trace)
  const manifest = {
    kind: "dpad_tile_set",
    recipeId,
    createdAt,
    workflow: opts.mode === "mock" ? "mock (triangles)" : `fal generate (${opts.endpoint})`,
    specs: {
      tileSize: { width: TILE_SIZE, height: TILE_SIZE },
      imageSize: opts.imageSize,
      naming: "dpad.png per direction folder",
      directions: [...DIRECTIONS],
    },
    generationRecipe: {
      mode: opts.mode,
      endpoint: opts.mode === "generate" ? opts.endpoint : null,
      seedRequested: opts.seed ?? null,
      note:
        opts.mode === "mock"
          ? "Mock: geometry from pngjs triangles, not T2I."
          : "Real: one fal.subscribe per direction; see per-direction entries in generationResults.",
    },
    provenance: {
      tool: "tools/dpad-workflow.mjs",
      version: 1,
    },
    generationResults,
  };

  const manifestPath = join(OUT_BASE, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  log("INFO", "manifest", `wrote ${manifestPath}`);

  // --- Tiles
  for (const dir of DIRECTIONS) {
    const folder = join(OUT_BASE, dir);
    await mkdir(folder, { recursive: true });
    const outPng = join(folder, "dpad.png");

    log("INFO", `tile:${dir}`, "begin", { outPng: join("public/art/dpad", dir, "dpad.png") });

    try {
      if (opts.mode === "mock") {
        const t0 = Date.now();
        const buf = renderMockPng(dir);
        timings[dir] = Date.now() - t0;
        await writeFile(outPng, buf);
        generationResults[dir] = { wallMs: timings[dir], seed: undefined };
        log("INFO", `tile:${dir}`, "mock PNG written", { bytes: buf.length, wallMs: timings[dir] });
      } else {
        const prompt = buildGenerationPrompt(dir);
        const t0 = Date.now();
        const r = await generateOneWithFal({
          endpoint: opts.endpoint,
          prompt,
          imageSize: opts.imageSize,
          outFile: outPng,
          seed: opts.seed,
          quiet,
        });
        timings[dir] = Date.now() - t0;
        generationResults[dir] = { seed: r.seed, wallMs: r.wallMs };
        log("INFO", `tile:${dir}`, "fal PNG saved", generationResults[dir]);
      }
    } catch (e) {
      const msg = opts.mode === "generate" ? formatFalClientError(e) : e instanceof Error ? e.message : String(e);
      generationResults[dir] = { error: msg };
      log("ERROR", `tile:${dir}`, "FAILED", { error: msg });
      manifest.generationResults = generationResults;
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
      log("WARN", "manifest", "updated after failure (partial state)");
      process.exit(1);
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
