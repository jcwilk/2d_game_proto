#!/usr/bin/env node
/**
 * D-pad tile workflow CLI — **delegates** to **`createPreset`** (`presets/dpad.mjs`) +
 * **`runPipeline`** (`sprite-generation/pipeline.mjs`). See preset and pipeline docs for behavior.
 *
 * Modes: `--mode mock` (default) | `--mode generate` (fal; needs FAL_KEY).
 *
 * @see tools/sprite-generation/presets/dpad.mjs
 * @see tools/sprite-generation/pipeline.mjs
 */

import { ApiError } from "@fal-ai/client";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { formatFalClientError } from "./sprite-generation/generators/fal.mjs";
import { log } from "./sprite-generation/logging.mjs";
import { runPipeline } from "./sprite-generation/pipeline.mjs";
import { DEFAULT_CHROMA_KEY_HEX } from "./sprite-generation/prompt.mjs";
import {
  createPreset,
  DEFAULT_FAL_ENDPOINT,
  SHEET_HEIGHT,
  SHEET_WIDTH,
  TILE_SIZE,
} from "./sprite-generation/presets/dpad.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_BASE = join(__dirname, "..", "public", "art", "dpad");

/** Euclidean RGB distance vs key — default tuned for FLUX magenta drift + fringe removal. */
const DEFAULT_CHROMA_TOLERANCE = 72;

function parseHexRgb(hex) {
  const s = String(hex).trim();
  const m = /^#?([0-9a-fA-F]{6})$/.exec(s);
  if (!m) throw new Error(`invalid hex color: ${hex}`);
  const n = Number.parseInt(m[1], 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function parseArgs(argv) {
  /** @type {{ mode: 'mock' | 'generate'; strategy: 'sheet' | 'per-tile'; endpoint: string; imageSize: string; seed?: number; keepSheet: boolean; savePreChroma: boolean; skipQa: boolean; dryRun: boolean; quiet: boolean; help: boolean; chromaKeyHex: string; chromaTolerance: number }} */
  const opts = {
    mode: "mock",
    strategy: "sheet",
    endpoint: DEFAULT_FAL_ENDPOINT,
    imageSize: `${TILE_SIZE}x${TILE_SIZE}`,
    keepSheet: false,
    savePreChroma: false,
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
      case "--save-pre-chroma":
        opts.savePreChroma = true;
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

D-pad tile preset: manifest + four frames (data-driven list) + png-analyze QA.

Options:
  --mode mock|generate   mock = RGBA triangles (default, no API).
                         generate = fal (needs FAL_KEY); post chroma-key → RGBA tiles.
  --strategy sheet|per-tile   For generate only. Default **sheet** = ONE ${SHEET_WIDTH}×${SHEET_HEIGHT} 1×4 strip + crop
                         (fal-ai/flux/dev txt2img).
                         **per-tile** = one fal-ai/flux/dev call per frame (same --seed when set).
  --keep-sheet           With --strategy sheet: also write public/art/dpad/sheet.png for debugging.
  --save-pre-chroma      With --mode generate --strategy per-tile: write dpad-pre-chroma.png per frame (raw fal before chroma).
  --endpoint <id>        fal model id (default: ${DEFAULT_FAL_ENDPOINT})
  --image-size <WxH>     per-tile: passed to fal per tile (default: ${TILE_SIZE}x${TILE_SIZE}).
                         Ignored for sheet (sheet is always ${SHEET_WIDTH}x${SHEET_HEIGHT}).
  --seed <int>           Optional fal seed: one job (sheet) or the SAME seed every per-tile call.
  --chroma-key <#RRGGBB>  Screen color in prompts + post removal (default: ${DEFAULT_CHROMA_KEY_HEX}).
  --chroma-tolerance <0-255>  Euclidean RGB distance from key for transparency (default: ${DEFAULT_CHROMA_TOLERANCE}).
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

  const preset = createPreset({
    outBase: OUT_BASE,
    provenanceTool: "tools/dpad-workflow.mjs",
    provenanceVersion: 4,
  });

  try {
    await runPipeline(preset, {
      mode: opts.mode,
      strategy: opts.strategy,
      dryRun: opts.dryRun,
      skipQa: opts.skipQa,
      quiet: opts.quiet,
      chromaKeyHex: opts.chromaKeyHex,
      chromaTolerance: opts.chromaTolerance,
      seed: opts.seed,
      endpoint: opts.endpoint,
      imageSize: opts.imageSize,
      keepSheet: opts.keepSheet,
      savePreChroma: opts.savePreChroma,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("FAL credentials missing")) {
      process.exit(2);
    }
    throw e;
  }
}

main().catch((e) => {
  const msg = e instanceof ApiError ? formatFalClientError(e) : e instanceof Error ? e.message : String(e);
  log("ERROR", "fatal", msg, { stack: e instanceof Error ? e.stack : undefined });
  process.exit(1);
});
