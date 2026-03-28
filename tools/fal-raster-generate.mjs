#!/usr/bin/env node
/**
 * Server-side Node script: call fal Model API for raster generation (FLUX.1 dev).
 * Do not import this from Vite or browser code — keep FAL_KEY off the client bundle.
 *
 * Endpoint id is pinned to the model’s /api page (see tools/README.md).
 */
import { fal } from "@fal-ai/client";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** @type {string} Exact endpoint id from https://fal.ai/models/fal-ai/flux/dev/api */
export const FAL_RASTER_ENDPOINT_ID = "fal-ai/flux/dev";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Default directory for saved raster files (under this repo’s `tools/`). */
export const DEFAULT_RASTER_OUT_DIR = join(__dirname, "out", "raster");

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

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {{ prompt: string; numImages: number; outputFormat: 'jpeg' | 'png'; seed?: number; imageSize: string; outDir: string }} */
  const opts = {
    prompt: "",
    numImages: 1,
    outputFormat: "png",
    imageSize: "square_hd",
    outDir: DEFAULT_RASTER_OUT_DIR,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`Missing value after ${a}`);
      return v;
    };
    switch (a) {
      case "--prompt":
        opts.prompt = next();
        break;
      case "--num-images":
        opts.numImages = Math.max(1, Math.min(4, Number.parseInt(next(), 10)));
        if (Number.isNaN(opts.numImages)) throw new Error("--num-images must be a number");
        break;
      case "--output-format": {
        const f = next();
        if (f !== "jpeg" && f !== "png") throw new Error("--output-format must be jpeg or png");
        opts.outputFormat = f;
        break;
      }
      case "--seed": {
        const n = Number.parseInt(next(), 10);
        if (Number.isNaN(n)) throw new Error("--seed must be an integer");
        opts.seed = n;
        break;
      }
      case "--image-size":
        opts.imageSize = next();
        break;
      case "--out-dir":
        opts.outDir = next();
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${a} (use --help)`);
    }
  }
  return opts;
}

function printHelp() {
  console.log(`Usage: node tools/fal-raster-generate.mjs --prompt <text> [options]

Calls fal endpoint "${FAL_RASTER_ENDPOINT_ID}" with image_size, num_images, output_format, and optional seed (per project plan §E.3.1).

Options:
  --prompt <string>       Required. Generation prompt.
  --image-size <value>    Preset (e.g. square_hd, landscape_4_3) or WxH like 512x512. Default: square_hd
  --num-images <1-4>      Batch size (separate images). Default: 1
  --output-format <jpeg|png>  Default: png
  --seed <int>            Optional reproducibility seed
  --out-dir <path>        Where to write files. Default: tools/out/raster/

Environment:
  FAL_KEY                 Required. fal API key (never commit).
`);
}

async function downloadToFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download image: HTTP ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(destPath, buf);
}

async function main() {
  if (!process.env.FAL_KEY || String(process.env.FAL_KEY).trim() === "") {
    console.error(
      "error: FAL_KEY is unset or empty. Set the fal API key in the environment only (e.g. export FAL_KEY=...). " +
        "Do not put keys in src/ or commit them.",
    );
    process.exit(1);
  }

  let opts;
  try {
    opts = parseArgs(process.argv);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`error: ${msg}`);
    process.exit(1);
  }

  if (!opts.prompt.trim()) {
    console.error("error: --prompt is required (non-empty).");
    process.exit(1);
  }

  fal.config({ credentials: process.env.FAL_KEY });

  const imageSize = parseImageSize(opts.imageSize);
  const input = {
    prompt: opts.prompt,
    image_size: imageSize,
    num_images: opts.numImages,
    output_format: opts.outputFormat,
  };
  if (opts.seed !== undefined) {
    input.seed = opts.seed;
  }

  const result = await fal.subscribe(FAL_RASTER_ENDPOINT_ID, {
    input,
    logs: true,
  });

  const data = result.data;
  if (!data || !Array.isArray(data.images) || data.images.length === 0) {
    console.error("error: fal returned no images in the response.");
    process.exit(1);
  }

  await mkdir(opts.outDir, { recursive: true });
  const ext = opts.outputFormat === "png" ? "png" : "jpg";
  const paths = [];
  for (let i = 0; i < data.images.length; i++) {
    const img = data.images[i];
    if (!img || typeof img.url !== "string") {
      throw new Error(`Invalid image entry at index ${i}`);
    }
    const name = `raster-${String(i + 1).padStart(3, "0")}.${ext}`;
    const dest = join(opts.outDir, name);
    await downloadToFile(img.url, dest);
    paths.push(dest);
  }

  console.log(`Wrote ${paths.length} file(s) to ${opts.outDir}:`);
  for (const p of paths) console.log(`  ${p}`);
  if (data.seed !== undefined) {
    console.log(`seed: ${data.seed}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
