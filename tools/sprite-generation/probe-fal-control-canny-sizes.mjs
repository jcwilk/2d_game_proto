#!/usr/bin/env node
/**
 * One-off probe: `fal-ai/flux-control-lora-canny` with varying `image_size` (400×100 object vs
 * string presets). Requires **FAL_KEY**. Used to fill `docs/fal-control-canny-image-size.md`.
 *
 *   FAL_KEY=... node tools/sprite-generation/probe-fal-control-canny-sizes.mjs
 */

import { fal } from "@fal-ai/client";

import { renderControlMaskBuffer } from "./control-image.mjs";
import {
  falSubscribeControlCannyToBuffer,
  pngBufferToDataUri,
  resolveFalCredentials,
} from "./generators/fal.mjs";
import { triangleForDirection } from "./generators/mock.mjs";

const ENDPOINT = "fal-ai/flux-control-lora-canny";
const TILE = 100;
const PROMPT =
  "Flat 2D HUD d-pad glyph, single white triangle on chroma green background, orthographic, no perspective.";

function log(level, step, message, extra) {
  const ts = new Date().toISOString();
  const base = `[${ts}] [probe] [${level}] [${step}] ${message}`;
  if (extra && Object.keys(extra).length > 0) {
    console.log(base, "|", JSON.stringify(extra));
  } else {
    console.log(base);
  }
}

async function main() {
  const cred = resolveFalCredentials();
  if (!cred) {
    console.error("FAL_KEY (or FAL_KEY_ID + FAL_KEY_SECRET) required for probe.");
    process.exit(1);
  }
  fal.config({ credentials: cred });

  const dir = /** @type {'up'} */ ("up");
  const controlBuf = renderControlMaskBuffer({ tileSize: TILE, vertices: triangleForDirection(dir, TILE) });
  const controlUrl = pngBufferToDataUri(controlBuf);

  /** @type {Array<{ label: string; imageSize: string }>} */
  const cases = [
    { label: "object_400x100", imageSize: "400x100" },
    { label: "preset_landscape_16_9", imageSize: "landscape_16_9" },
    { label: "preset_landscape_4_3", imageSize: "landscape_4_3" },
    { label: "preset_square_hd", imageSize: "square_hd" },
  ];

  const results = [];
  for (const c of cases) {
    log("INFO", "case", `start ${c.label}`, { imageSize: c.imageSize });
    const t0 = Date.now();
    try {
      const r = await falSubscribeControlCannyToBuffer({
        endpoint: ENDPOINT,
        prompt: PROMPT,
        imageSize: c.imageSize,
        seed: 42,
        quiet: true,
        controlImageUrl: controlUrl,
        falExtraInput: {
          num_inference_steps: 28,
          guidance_scale: 3.5,
          preprocess_depth: false,
          control_lora_strength: 0.58,
        },
        log,
      });
      results.push({
        label: c.label,
        requested: c.imageSize,
        wallMs: r.wallMs,
        ok: true,
      });
    } catch (e) {
      results.push({
        label: c.label,
        requested: c.imageSize,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        wallMs: Date.now() - t0,
      });
    }
  }

  console.log("\n--- summary (see logs above for pngDecodedPx per case) ---");
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
