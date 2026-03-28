#!/usr/bin/env node
/**
 * Deterministic PNG analysis: dimensions, alpha stats, grid projection (§E.5 / §E.5.1).
 * Exit codes: 0 = success, 1 = usage/validation error, 2 = I/O or decode failure.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { analyzePngBuffer } from "./png-analyze-metrics.mjs";

function printHelp() {
  const lines = [
    "Usage: node tools/png-analyze.mjs <image.png> [--sprite-width W] [--sprite-height H]",
    "",
    "Prints JSON: dimensions, file size, alpha coverage + 256-bin histogram, opaque-pixel bbox,",
    "and optional grid projection vs cell size (remainders, divisibility, mean edge energy on internal grid lines).",
    "",
    "Options:",
    "  --sprite-width W   Expected grid cell width in pixels (use with --sprite-height)",
    "  --sprite-height H  Expected grid cell height in pixels",
    "  --help, -h         Show this message",
    "",
    "Exit codes: 0 success, 1 invalid args, 2 file read or PNG decode error.",
  ];
  console.log(lines.join("\n"));
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {{ imagePath: string; spriteWidth?: number; spriteHeight?: number }} */
  const out = { imagePath: "" };
  if (argv.length <= 2) {
    throw new Error("Missing image path");
  }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      case "--sprite-width": {
        const v = argv[++i];
        if (v === undefined) throw new Error("Missing value after --sprite-width");
        out.spriteWidth = Number.parseInt(v, 10);
        if (Number.isNaN(out.spriteWidth) || out.spriteWidth <= 0) {
          throw new Error("--sprite-width must be a positive integer");
        }
        break;
      }
      case "--sprite-height": {
        const v = argv[++i];
        if (v === undefined) throw new Error("Missing value after --sprite-height");
        out.spriteHeight = Number.parseInt(v, 10);
        if (Number.isNaN(out.spriteHeight) || out.spriteHeight <= 0) {
          throw new Error("--sprite-height must be a positive integer");
        }
        break;
      }
      default:
        if (a.startsWith("-")) {
          throw new Error(`Unknown option: ${a}`);
        }
        if (out.imagePath) {
          throw new Error("Multiple image paths are not supported");
        }
        out.imagePath = a;
    }
  }
  if (!out.imagePath) {
    throw new Error("Missing image path");
  }
  const hasW = out.spriteWidth !== undefined;
  const hasH = out.spriteHeight !== undefined;
  if (hasW !== hasH) {
    throw new Error("Use both --sprite-width and --sprite-height for grid projection");
  }
  return out;
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(msg);
    printHelp();
    process.exit(1);
  }

  const imagePath = resolve(process.cwd(), opts.imagePath);
  let buffer;
  try {
    buffer = readFileSync(imagePath);
  } catch (e) {
    console.error(`Failed to read file: ${imagePath}`);
    process.exit(2);
  }

  let result;
  try {
    result = analyzePngBuffer(buffer, {
      spriteWidth: opts.spriteWidth,
      spriteHeight: opts.spriteHeight,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`PNG decode failed: ${msg}`);
    process.exit(2);
  }

  console.log(JSON.stringify(result, null, 2));
}

main();
