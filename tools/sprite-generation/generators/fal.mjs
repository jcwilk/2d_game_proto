/**
 * fal.ai client helpers: credentials, image size parsing, downloads, and subscribe→buffer.
 * Aligns with `tools/fal-raster-generate.mjs` / `tools/dpad-workflow.mjs` behavior.
 */

import { ApiError } from "@fal-ai/client";
import { fal } from "@fal-ai/client";
import { writeFile } from "node:fs/promises";

import { log as defaultLog } from "../logging.mjs";

export function resolveFalCredentials() {
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
export function formatFalClientError(err) {
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
export function parseImageSize(s) {
  const m = /^(\d+)x(\d+)$/.exec(s.trim());
  if (m) {
    return { width: Number(m[1]), height: Number(m[2]) };
  }
  return s;
}

/**
 * @param {string} url
 * @param {typeof fetch} [fetchImpl]
 */
export async function downloadToBuffer(url, fetchImpl = globalThis.fetch) {
  const res = await fetchImpl(url);
  if (!res.ok) {
    throw new Error(`Failed to download image: HTTP ${res.status} ${res.statusText}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * @param {string} url
 * @param {string} destPath
 * @param {typeof fetch} [fetchImpl]
 */
export async function downloadToFile(url, destPath, fetchImpl = globalThis.fetch) {
  const buf = await downloadToBuffer(url, fetchImpl);
  await writeFile(destPath, buf);
}

/**
 * @param {object} params
 * @param {string} params.endpoint
 * @param {string} params.prompt
 * @param {string} params.imageSize
 * @param {number|undefined} params.seed
 * @param {boolean} params.quiet
 * @param {Record<string, unknown>|undefined} params.falExtraInput  Merged into fal input (e.g. guidance_scale).
 * @param {(level: 'DEBUG'|'INFO'|'WARN'|'ERROR', step: string, message: string, extra?: Record<string, unknown>) => void} [params.log]
 * @param {import('@fal-ai/client').FalClient['subscribe']} [params.falSubscribe]
 * @param {typeof fetch} [params.fetch]
 * @returns {Promise<{ buffer: Buffer; seed?: number; wallMs: number }>}
 */
export async function falSubscribeToBuffer(params) {
  const { endpoint, prompt, imageSize, seed, quiet, falExtraInput, falSubscribe, fetch: fetchImpl } = params;
  const log = params.log ?? defaultLog;

  const subscribe = falSubscribe ?? ((ep, opts) => fal.subscribe(ep, opts));
  const fetchFn = fetchImpl ?? globalThis.fetch;

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
    log("DEBUG", "fal:prompt", "full prompt follows", {});
    console.log(prompt);
  }

  const t0 = Date.now();
  let lastStatus = "";

  const result = await subscribe(endpoint, {
    input,
    logs: true,
    onQueueUpdate: (status) => {
      const s = status && typeof status === "object" && "status" in status ? String(status.status) : "?";
      if (s !== lastStatus) {
        lastStatus = s;
        log("DEBUG", "fal:queue", `status=${s}`, {
          ...(typeof status === "object" && status !== null && "position" in status ? { position: status.position } : {}),
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
  const buffer = await downloadToBuffer(img0.url, fetchFn);

  const outSeed = data.seed;
  log("INFO", `fal:${endpoint}`, "subscribe() done", {
    wallMs,
    seedReturned: outSeed,
    bytes: buffer.length,
  });

  return { buffer, seed: outSeed, wallMs };
}

/**
 * @param {Buffer} buf  PNG bytes
 * @returns {string} `data:image/png;base64,...` for fal file inputs
 */
export function pngBufferToDataUri(buf) {
  if (!Buffer.isBuffer(buf)) {
    throw new Error("pngBufferToDataUri: expected Buffer");
  }
  return `data:image/png;base64,${buf.toString("base64")}`;
}

/**
 * **`fal-ai/flux-control-lora-canny`**: Canny control LoRA — **`control_lora_image_url`** required
 * (URL or data URI). Set **`preprocess_depth: false`** so the service derives Canny edges from the
 * control image (triangle silhouette), not a depth map.
 *
 * @param {object} params
 * @param {string} params.endpoint  e.g. `fal-ai/flux-control-lora-canny`
 * @param {string} params.prompt
 * @param {string} params.imageSize  e.g. `256x256`
 * @param {string} params.controlImageUrl  Data URI or HTTPS URL of control image
 * @param {number|undefined} params.seed
 * @param {boolean} params.quiet
 * @param {Record<string, unknown>|undefined} params.falExtraInput  Merged into input (guidance, steps, `preprocess_depth`, `control_lora_strength`, …)
 * @param {(level: 'DEBUG'|'INFO'|'WARN'|'ERROR', step: string, message: string, extra?: Record<string, unknown>) => void} [params.log]
 * @param {import('@fal-ai/client').FalClient['subscribe']} [params.falSubscribe]
 * @param {typeof fetch} [params.fetch]
 * @returns {Promise<{ buffer: Buffer; seed?: number; wallMs: number }>}
 */
export async function falSubscribeControlCannyToBuffer(params) {
  const {
    endpoint,
    prompt,
    imageSize,
    seed,
    quiet,
    falExtraInput,
    controlImageUrl,
    falSubscribe,
    fetch: fetchImpl,
  } = params;
  const log = params.log ?? defaultLog;

  const subscribe = falSubscribe ?? ((ep, opts) => fal.subscribe(ep, opts));
  const fetchFn = fetchImpl ?? globalThis.fetch;

  const image_size = parseImageSize(imageSize);
  const input = {
    prompt,
    image_size,
    num_images: 1,
    output_format: "png",
    control_lora_image_url: controlImageUrl,
    preprocess_depth: false,
    ...(falExtraInput && typeof falExtraInput === "object" ? falExtraInput : {}),
  };
  if (seed !== undefined) {
    input.seed = seed;
  }

  log("INFO", `fal:${endpoint}`, "subscribe() control-canny starting", {
    image_size: typeof image_size === "string" ? image_size : image_size,
    seed: input.seed ?? null,
    promptChars: prompt.length,
    controlImage: "data-uri-or-url",
  });
  if (!quiet) {
    log("DEBUG", "fal:prompt", "full prompt follows", {});
    console.log(prompt);
  }

  const t0 = Date.now();
  let lastStatus = "";

  const result = await subscribe(endpoint, {
    input,
    logs: true,
    onQueueUpdate: (status) => {
      const s = status && typeof status === "object" && "status" in status ? String(status.status) : "?";
      if (s !== lastStatus) {
        lastStatus = s;
        log("DEBUG", "fal:queue", `status=${s}`, {
          ...(typeof status === "object" && status !== null && "position" in status ? { position: status.position } : {}),
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
  const buffer = await downloadToBuffer(img0.url, fetchFn);

  const outSeed = data.seed;
  log("INFO", `fal:${endpoint}`, "subscribe() done", {
    wallMs,
    seedReturned: outSeed,
    bytes: buffer.length,
  });

  return { buffer, seed: outSeed, wallMs };
}
