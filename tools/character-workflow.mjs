#!/usr/bin/env node
/**
 * Character walk-cycle workflow CLI — **`createPreset`** (`presets/character.mjs`) +
 * **`runPipeline`** (`sprite-generation/pipeline.mjs`).
 *
 * @see tools/sprite-generation/presets/character.mjs
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
  CHARACTER_CHROMA_TOLERANCE_DEFAULT,
  createPreset,
  DEFAULT_FAL_ENDPOINT,
  SHEET_HEIGHT,
  SHEET_WIDTH,
  TILE_SIZE,
} from "./sprite-generation/presets/character.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_BASE = join(__dirname, "..", "public", "art", "character");

const DEFAULT_CHROMA_TOLERANCE = CHARACTER_CHROMA_TOLERANCE_DEFAULT;

function parseHexRgb(hex) {
  const s = String(hex).trim();
  const m = /^#?([0-9a-fA-F]{6})$/.exec(s);
  if (!m) throw new Error(`invalid hex color: ${hex}`);
  const n = Number.parseInt(m[1], 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function parseArgs(argv) {
  /** @type {{ mode: 'mock' | 'generate'; strategy: 'sheet' | 'per-tile'; endpoint: string; imageSize: string; seed?: number; keepSheet: boolean; savePreChroma: boolean; skipQa: boolean; dryRun: boolean; quiet: boolean; help: boolean; chromaKeyHex: string; chromaTolerance: number; sheetRewrite: boolean | undefined; chromaAfterBria: boolean | undefined; chromaFringeEdgeDist: number | undefined; chromaSpillMaxDist: number | undefined }} */
  const opts = {
    mode: "mock",
    strategy: "sheet",
    endpoint: DEFAULT_FAL_ENDPOINT,
    imageSize: `${TILE_SIZE}x${TILE_SIZE}`,
    keepSheet: true,
    savePreChroma: false,
    skipQa: false,
    dryRun: false,
    quiet: false,
    help: false,
    chromaKeyHex: DEFAULT_CHROMA_KEY_HEX,
    chromaTolerance: DEFAULT_CHROMA_TOLERANCE,
    /** `undefined` → use preset (`character` defaults to rewrite on for generate sheet). */
    sheetRewrite: undefined,
    /** `undefined` → use preset (`character` defaults chroma-after-BRIA on). */
    chromaAfterBria: undefined,
    /** `undefined` → use preset silhouette peel distance; **`0`** disables peel. */
    chromaFringeEdgeDist: undefined,
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
      case "--no-keep-sheet":
        opts.keepSheet = false;
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
      case "--rewrite":
        opts.sheetRewrite = true;
        break;
      case "--no-rewrite":
        opts.sheetRewrite = false;
        break;
      case "--chroma-after-bria":
        opts.chromaAfterBria = true;
        break;
      case "--no-chroma-after-bria":
        opts.chromaAfterBria = false;
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
      case "--chroma-fringe-edge-dist": {
        const v = Number.parseInt(next(), 10);
        if (Number.isNaN(v) || v < 0 || v > 400) {
          throw new Error("--chroma-fringe-edge-dist must be an integer 0–400 (0 = off)");
        }
        opts.chromaFringeEdgeDist = v;
        break;
      }
      case "--chroma-spill-max-dist": {
        const v = Number.parseInt(next(), 10);
        if (Number.isNaN(v) || v < 0 || v > 400) {
          throw new Error("--chroma-spill-max-dist must be an integer 0–400 (0 = off)");
        }
        opts.chromaSpillMaxDist = v;
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
  console.log(`Usage: node tools/character-workflow.mjs [options]

Character walk-cycle preset: manifest + **sheet.png** + **sprite-ref.json** (grid); no per-frame walk_* tiles.

Options:
  --mode mock|generate   mock = deterministic walk figures (default, no API).
  --strategy sheet|per-tile   For generate only. Default **sheet** = ONE ${SHEET_WIDTH}×${SHEET_HEIGHT} 2×2 grid.
  --keep-sheet           With --strategy sheet: write public/art/character/sheet.png (default **on**).
  --no-keep-sheet        Skip writing sheet.png (unusual; sheet-only preset expects sheet.png for the game).
  --save-pre-chroma      With --mode generate --strategy per-tile: write pre-chroma PNG per frame.
  --endpoint <id>        fal model id (default: ${DEFAULT_FAL_ENDPOINT}).
  --image-size <WxH>     per-tile size (default: ${TILE_SIZE}x${TILE_SIZE}).
  --seed <int>
  --chroma-key <#RRGGBB>  (default: ${DEFAULT_CHROMA_KEY_HEX})
  --chroma-tolerance <0-255>  (default: ${DEFAULT_CHROMA_TOLERANCE})
  --skip-qa
  --dry-run
  --rewrite              Sheet: force OpenRouter prompt rewrite before T2I (needs FAL_KEY).
  --no-rewrite           Sheet: skip rewrite (preset defaults to rewrite ON for generate).
  --chroma-after-bria    Sheet: run per-tile chroma after BRIA (fringe cleanup).
  --no-chroma-after-bria Sheet: skip per-tile chroma after BRIA (default for character: BRIA-only).
  --chroma-fringe-edge-dist <0-400>  After chroma: peel near-key pixels on the silhouette (default from preset; 0 = off).
  --quiet, -q
  --help, -h

Examples:
  node tools/character-workflow.mjs --mode mock
  node --env-file=.env tools/character-workflow.mjs --mode generate --strategy sheet
  FAL_KEY=… npm run character-workflow -- --mode generate --strategy sheet
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
    provenanceTool: "tools/character-workflow.mjs",
    provenanceVersion: 1,
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
      sheetRewrite: opts.sheetRewrite,
      ...(opts.chromaAfterBria !== undefined ? { chromaAfterBria: opts.chromaAfterBria } : {}),
      ...(opts.chromaFringeEdgeDist !== undefined ? { chromaFringeEdgeDist: opts.chromaFringeEdgeDist } : {}),
      ...(opts.chromaSpillMaxDist !== undefined ? { chromaSpillMaxDist: opts.chromaSpillMaxDist } : {}),
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
