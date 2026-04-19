#!/usr/bin/env node
/**
 * Server-side Node script: call fal Model API for raster generation (FLUX.1 dev).
 * Do not import this from Vite or browser code — keep FAL_KEY off the client bundle.
 *
 * Endpoint id is pinned to the model’s /api page (see tools/README.md).
 */
import { ApiError, fal } from "@fal-ai/client";
import type { FluxDevInput } from "@fal-ai/client/endpoints";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Exact endpoint id from https://fal.ai/models/fal-ai/flux/dev/api */
export const FAL_RASTER_ENDPOINT_ID = "fal-ai/flux/dev";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Default directory for saved raster files (under this repo’s `tools/`). */
export const DEFAULT_RASTER_OUT_DIR = join(__dirname, "out", "raster");

type OutputFormat = "jpeg" | "png";

function parseImageSize(s: string): { width: number; height: number } | string {
  const m = /^(\d+)x(\d+)$/.exec(s.trim());
  if (m) {
    return { width: Number(m[1]), height: Number(m[2]) };
  }
  return s;
}

interface ParsedOpts {
  prompt: string;
  numImages: number;
  outputFormat: OutputFormat;
  seed?: number;
  imageSize: string;
  outDir: string;
}

function parseArgs(argv: string[]): ParsedOpts {
  const opts: ParsedOpts = {
    prompt: "",
    numImages: 1,
    outputFormat: "png",
    imageSize: "square_hd",
    outDir: DEFAULT_RASTER_OUT_DIR,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = (): string => {
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

function printHelp(): void {
  console.log(`Usage: node --experimental-strip-types tools/fal-raster-generate.ts --prompt <text> [options]

Or: npm run generate:raster -- --prompt <text> [options]

Calls fal endpoint "${FAL_RASTER_ENDPOINT_ID}" with image_size, num_images, output_format, and optional seed (per project plan §E.3.1).

Options:
  --prompt <string>       Required. Generation prompt.
  --image-size <value>    Preset (e.g. square_hd, landscape_4_3) or WxH like 512x512. Default: square_hd
  --num-images <1-4>      Batch size (separate images). Default: 1
  --output-format <jpeg|png>  Default: png
  --seed <int>            Optional reproducibility seed
  --out-dir <path>        Where to write files. Default: tools/out/raster/

Environment:
  FAL_KEY                 fal API key (never commit). Trimmed on use.
  FAL_KEY_ID + FAL_KEY_SECRET   Alternative: combined as id:secret (see fal docs).

On HTTP 403 Forbidden, read the printed detail — often account billing (add balance at fal.ai/dashboard/billing).
`);
}

function resolveFalCredentials(): string | undefined {
  const direct = process.env["FAL_KEY"];
  if (direct !== undefined && String(direct).trim() !== "") {
    return String(direct).trim();
  }
  const id = process.env["FAL_KEY_ID"];
  const secret = process.env["FAL_KEY_SECRET"];
  if (id && secret && String(id).trim() && String(secret).trim()) {
    return `${String(id).trim()}:${String(secret).trim()}`;
  }
  return undefined;
}

function formatFalClientError(err: unknown): string {
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

async function downloadToFile(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download image: HTTP ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(destPath, buf);
}

interface FalRasterData {
  images: Array<{ url?: string } | null | undefined>;
  seed?: number;
}

function isFalRasterData(data: unknown): data is FalRasterData {
  if (data === null || typeof data !== "object") return false;
  if (!("images" in data)) return false;
  const images = (data as { images: unknown }).images;
  return Array.isArray(images) && images.length > 0;
}

async function main(): Promise<void> {
  const credentials = resolveFalCredentials();
  if (!credentials) {
    console.error(
      "error: No fal credentials. Set FAL_KEY in the environment, or FAL_KEY_ID and FAL_KEY_SECRET " +
        "(see https://fal.ai/docs/model-apis/authentication). Do not put keys in src/ or commit them.",
    );
    process.exit(1);
  }

  let opts: ParsedOpts;
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

  fal.config({ credentials });

  const imageSize = parseImageSize(opts.imageSize) as NonNullable<FluxDevInput["image_size"]>;
  const input: FluxDevInput = {
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
  if (!isFalRasterData(data)) {
    console.error("error: fal returned no images in the response.");
    process.exit(1);
  }

  await mkdir(opts.outDir, { recursive: true });
  const ext = opts.outputFormat === "png" ? "png" : "jpg";
  const paths: string[] = [];
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

main().catch((e: unknown) => {
  console.error(`error: ${formatFalClientError(e)}`);
  process.exit(1);
});
