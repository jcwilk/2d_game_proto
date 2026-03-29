/**
 * fal.ai client helpers: credentials, image size parsing, downloads, and subscribe→buffer.
 * Aligns with `tools/fal-raster-generate.mjs` / `tools/dpad-workflow.mjs` behavior.
 *
 * **Observability:** Before each `subscribe()`, we log a **JSON-serializable, redacted copy** of the
 * full `input` object (`redactFalInputForLog`). After the result URL is downloaded, we decode **PNG
 * width/height** via `readPngBufferDimensions` (primary: `PNG.sync.read` from **pngjs**; fallback:
 * IHDR parse when the first chunk is IHDR) and log `pngDecodedPx` next to the requested `image_size`.
 */

import { createHash } from "node:crypto";
import { ApiError } from "@fal-ai/client";
import { fal } from "@fal-ai/client";
import { writeFile } from "node:fs/promises";
import { PNG } from "pngjs";

import { log as defaultLog } from "../logging.mjs";

/**
 * Stable short fingerprint for logs (full prompt is never logged at INFO).
 *
 * @param {string} prompt
 */
export function hashPromptForLog(prompt) {
  return createHash("sha256").update(String(prompt), "utf8").digest("hex").slice(0, 16);
}

/**
 * Redacts large data URIs and prompt text for safe structured logging. Policy:
 * - **String keys ending with `_url`** (incl. **`control_lora_image_url`** and other fal file inputs): if
 *   `data:` URI, replace with length + media prefix only; HTTPS URLs keep host + truncated path (no query secrets).
 * - **`prompt`** / **`system_prompt`**: replaced with `{ length, sha256Hex16 }` (see `hashPromptForLog`).
 * - Keys matching obvious secret names: value replaced with `"<redacted>"`.
 *
 * @param {Record<string, unknown>} input  Full fal `subscribe` input object (already merged).
 * @returns {Record<string, unknown>}
 */
function redactUrlLikeString(s) {
  if (s.startsWith("data:")) {
    const comma = s.indexOf(",");
    const head = comma >= 0 ? s.slice(0, comma) : s.slice(0, 64);
    const payloadLen = comma >= 0 ? s.length - comma - 1 : 0;
    return `<data-uri ${head} payloadChars=${payloadLen}>`;
  }
  try {
    const u = new URL(s);
    const path = u.pathname.length > 48 ? `${u.pathname.slice(0, 48)}…` : u.pathname;
    return `<url host=${u.host} path=${path}>`;
  } catch {
    return "<url (unparseable)>";
  }
}

export function redactFalInputForLog(input) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(input)) {
    if (/_url$/i.test(k) && typeof v === "string") {
      out[k] = redactUrlLikeString(v);
      continue;
    }
    if ((k === "prompt" || k === "system_prompt") && typeof v === "string") {
      out[k] = { length: v.length, sha256Hex16: hashPromptForLog(v) };
      continue;
    }
    if (/secret|password|token|api_?key|credential/i.test(k)) {
      out[k] = "<redacted>";
      continue;
    }
    out[k] = v;
  }
  return out;
}

/**
 * Decoded PNG dimensions from the downloaded fal image buffer.
 *
 * @param {Buffer} buf
 * @returns {{ width: number; height: number; decode: 'pngjs' | 'ihdr' } | null}
 */
export function readPngBufferDimensions(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 24) {
    return null;
  }
  try {
    const png = PNG.sync.read(buf);
    return { width: png.width, height: png.height, decode: "pngjs" };
  } catch {
    if (
      buf.length >= 24 &&
      buf[12] === 0x49 &&
      buf[13] === 0x48 &&
      buf[14] === 0x44 &&
      buf[15] === 0x52
    ) {
      return {
        width: buf.readUInt32BE(16),
        height: buf.readUInt32BE(20),
        decode: "ihdr",
      };
    }
    return null;
  }
}

/**
 * **Pipeline checkpoint:** assert decoded PNG dimensions match the preset raster **`expectedW`×`expectedH`**
 * after **`normalizeDecodedSheetToPreset`** (sheet and per-tile) per **2gp-r67u** / **2gp-6iay**. Use a stable **`stageLabel`** for logs and tests (e.g. `pipeline:raster-after-sheet-normalize`).
 *
 * @param {Buffer} buf
 * @param {number} expectedW
 * @param {number} expectedH
 * @param {string} stageLabel
 */
export function assertPngBufferDimensions(buf, expectedW, expectedH, stageLabel) {
  const d = readPngBufferDimensions(buf);
  if (!d) {
    throw new Error(`${stageLabel}: expected valid PNG buffer`);
  }
  if (d.width !== expectedW || d.height !== expectedH) {
    throw new Error(`${stageLabel}: expected ${expectedW}x${expectedH}, got ${d.width}x${d.height}`);
  }
}

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

/** @see tools/sprite-generation/FALSPRITE_INTEGRATION_PLAN.md — nano-banana-2 resolution enum (verify on fal OpenAPI when changing). */
export const NANO_BANANA2_DEFAULT_ASPECT_RATIO = "4:1";
export const NANO_BANANA2_DEFAULT_RESOLUTION = "1K";

/**
 * BRIA background removal — one HTTPS `image_url` in, PNG with alpha out (`data.image.url` per fal OpenAPI).
 * Uses **`fal.subscribe`** (queued) like other fal image models; **`fal.run`** is a shorter synchronous
 * alternative in fal docs — we keep **subscribe** for consistent queue/logging with T2I (**Phase C** plan).
 */
export const BRIA_BACKGROUND_REMOVE_ENDPOINT = "fal-ai/bria/background/remove";

/** fal queue id for OpenRouter-backed chat completions (one **`FAL_KEY`**). */
export const OPENROUTER_ROUTER_ENDPOINT = "openrouter/router";

/** Default LLM id for optional sheet prompt rewrite (**`rewritePromptViaOpenRouter`**). */
export const DEFAULT_SHEET_REWRITE_MODEL = "openai/gpt-4o-mini";

/**
 * Default system instructions for sheet prompt rewrite — HUD glyph / strip layout consistency.
 * Presets may override via **`preset.fal.sheetRewrite.systemPrompt`**.
 */
export const DEFAULT_SHEET_REWRITE_SYSTEM_PROMPT =
  "You rewrite image-generation prompts for a single horizontal UI sprite sheet. " +
  "Keep the user's layout constraints (grid, chroma key, dimensions). Output only the improved prompt text, no preamble.";

/**
 * True for `fal-ai/nano-banana-2` and ids that share the same family prefix (version suffixes).
 *
 * @param {string} endpoint
 */
export function isNanoBanana2Endpoint(endpoint) {
  const e = String(endpoint);
  return e === "fal-ai/nano-banana-2" || e.startsWith("fal-ai/nano-banana-2/");
}

/**
 * Coarse endpoint family for **`falExtras`** merge in **`pipeline.mjs`**: nano-banana-2 vs Flux-shaped
 * (`image_size`) models. Non-nano endpoints share the Flux strategy family.
 *
 * @param {string} endpoint
 * @returns {'nano-banana-2' | 'flux'}
 */
export function getFalImageEndpointFamily(endpoint) {
  return isNanoBanana2Endpoint(endpoint) ? "nano-banana-2" : "flux";
}

/**
 * True when **`a`** and **`b`** use the same fal input shape / extras blob (Phase D Option B).
 *
 * @param {string} a
 * @param {string} b
 */
export function sameImageEndpointFamily(a, b) {
  return getFalImageEndpointFamily(a) === getFalImageEndpointFamily(b);
}

/**
 * Sheet path: run BRIA matting after nano-banana (or any T2I that returns an HTTPS image URL) when
 * **`preset.fal.sheetMatting`** is **`'bria'`**, or **`'auto'`** / omitted and **`endpoint`** is nano-banana-2.
 * Set **`preset.fal.sheetMatting`** to **`'none'`** to force chroma-only on the raw T2I PNG (e.g. Flux).
 *
 * @param {{ fal?: { sheetMatting?: 'auto' | 'bria' | 'none' } }} preset
 * @param {string} endpoint
 * @returns {boolean}
 */
export function shouldUseBriaSheetMatting(preset, endpoint) {
  const m = preset.fal?.sheetMatting;
  if (m === "bria") return true;
  if (m === "none") return false;
  return isNanoBanana2Endpoint(endpoint);
}

/**
 * Central parse for image subscribe responses (`data.images[].url`). Swap or extend if a model
 * diverges (keep call sites on this helper + fixture tests).
 *
 * @param {unknown} data  `result.data` from fal.subscribe
 * @returns {{ url: string; seed?: number; image0: Record<string, unknown> }}
 */
export function parseFalImageSubscribeResult(data) {
  if (!data || typeof data !== "object") {
    throw new Error("fal returned empty or invalid response data");
  }
  const d = /** @type {{ images?: unknown[]; seed?: number }} */ (data);
  if (!Array.isArray(d.images) || d.images.length === 0) {
    throw new Error("fal returned no images in response data");
  }
  const img0 = d.images[0];
  if (!img0 || typeof img0 !== "object") {
    throw new Error("fal image[0] missing or invalid");
  }
  const row = /** @type {Record<string, unknown>} */ (img0);
  const url = row.url;
  if (typeof url !== "string") {
    throw new Error("fal image[0] missing url");
  }
  return { url, seed: d.seed, image0: row };
}

/**
 * Parse **`fal-ai/bria/background/remove`** subscribe result — output is **`{ image: { url, width, ... } }`**, not **`images[]`**.
 *
 * @param {unknown} data  `result.data` from fal.subscribe
 * @returns {{ url: string; seed?: number; image0: Record<string, unknown> }}
 * @see https://fal.ai/models/fal-ai/bria/background/remove/api (Output schema)
 */
export function parseFalBriaBackgroundRemoveResult(data) {
  if (!data || typeof data !== "object") {
    throw new Error("fal returned empty or invalid response data");
  }
  const d = /** @type {{ image?: { url?: string; width?: number; height?: number } }} */ (data);
  const img = d.image;
  if (!img || typeof img !== "object") {
    throw new Error("fal bria/background/remove returned no image in response data");
  }
  const row = /** @type {Record<string, unknown>} */ (img);
  const url = img.url;
  if (typeof url !== "string") {
    throw new Error("fal bria/background/remove image missing url");
  }
  return { url, seed: undefined, image0: row };
}

/**
 * @param {unknown} data  `result.data` from **`openrouter/router`**
 * @returns {string} Trimmed completion text
 */
export function parseOpenRouterRouterOutput(data) {
  if (!data || typeof data !== "object") {
    throw new Error("openrouter/router returned empty or invalid response data");
  }
  const d = /** @type {{ output?: unknown; error?: unknown }} */ (data);
  if (typeof d.error === "string" && d.error.trim()) {
    throw new Error(`openrouter/router: ${d.error.trim()}`);
  }
  if (typeof d.output !== "string" || !d.output.trim()) {
    throw new Error("openrouter/router returned no output text");
  }
  return d.output.trim();
}

/**
 * Optional LLM rewrite via **`fal.subscribe("openrouter/router", { input })`** — same **`FAL_KEY`** as T2I.
 * Never logs full prompt text at INFO (**`redactFalInputForLog`**).
 *
 * @param {object} params
 * @param {string} params.userPrompt
 * @param {string} [params.systemPrompt]
 * @param {string} params.model
 * @param {number} [params.temperature]
 * @param {number} [params.maxTokens]
 * @param {boolean} [params.quiet]
 * @param {(level: 'DEBUG'|'INFO'|'WARN'|'ERROR', step: string, message: string, extra?: Record<string, unknown>) => void} [params.log]
 * @param {import('@fal-ai/client').FalClient['subscribe']} [params.falSubscribe]
 * @returns {Promise<{ text: string; wallMs: number }>}
 */
export async function rewritePromptViaOpenRouter(params) {
  const { userPrompt, systemPrompt, model, temperature, maxTokens, quiet, falSubscribe } = params;
  const log = params.log ?? defaultLog;
  const subscribe = falSubscribe ?? ((ep, opts) => fal.subscribe(ep, opts));

  /** @type {Record<string, unknown>} */
  const input = {
    prompt: userPrompt,
    model,
  };
  if (systemPrompt !== undefined && systemPrompt !== "") {
    input.system_prompt = systemPrompt;
  }
  if (temperature !== undefined) {
    input.temperature = temperature;
  }
  if (maxTokens !== undefined) {
    input.max_tokens = maxTokens;
  }

  log("INFO", `fal:${OPENROUTER_ROUTER_ENDPOINT}`, "subscribe() request input (redacted)", redactFalInputForLog(input));
  if (!quiet) {
    log("DEBUG", "fal:rewrite-prompt", "full user prompt follows", {});
    console.log(userPrompt);
    if (systemPrompt) {
      log("DEBUG", "fal:rewrite-system", "full system prompt follows", {});
      console.log(systemPrompt);
    }
  }

  const t0 = Date.now();
  const result = await subscribe(OPENROUTER_ROUTER_ENDPOINT, {
    input,
    logs: true,
    onQueueUpdate: (status) => {
      const s = status && typeof status === "object" && "status" in status ? String(status.status) : "?";
      log("DEBUG", "fal:queue", `openrouter status=${s}`, {});
    },
  });
  const wallMs = Date.now() - t0;
  const text = parseOpenRouterRouterOutput(result.data);
  log("INFO", `fal:${OPENROUTER_ROUTER_ENDPOINT}`, "subscribe() done", {
    wallMs,
    outputChars: text.length,
    outputSha256Hex16: hashPromptForLog(text),
  });
  return { text, wallMs };
}

/**
 * @param {object} ctx
 * @param {string} ctx.prompt
 * @param {string} ctx.imageSize  e.g. `400x100` (Flux); ignored for nano-banana-2 API shape.
 * @param {number|undefined} ctx.seed
 * @param {Record<string, unknown>|undefined} ctx.falExtraInput
 */
function buildFluxImageInput(ctx) {
  const { prompt, imageSize, seed, falExtraInput } = ctx;
  const image_size = parseImageSize(imageSize);
  /** @type {Record<string, unknown>} */
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
  return input;
}

/**
 * nano-banana-2: `aspect_ratio` + `resolution`, not Flux `image_size`.
 *
 * @param {object} ctx
 * @param {string} ctx.prompt
 * @param {number|undefined} ctx.seed
 * @param {Record<string, unknown>|undefined} ctx.falExtraInput
 */
function buildNanoBanana2ImageInput(ctx) {
  const { prompt, seed, falExtraInput } = ctx;
  /** @type {Record<string, unknown>} */
  const input = {
    prompt,
    aspect_ratio: NANO_BANANA2_DEFAULT_ASPECT_RATIO,
    resolution: NANO_BANANA2_DEFAULT_RESOLUTION,
    num_images: 1,
    output_format: "png",
    ...(falExtraInput && typeof falExtraInput === "object" ? falExtraInput : {}),
  };
  if (seed !== undefined) {
    input.seed = seed;
  }
  return input;
}

/**
 * @typedef {object} FalImageEndpointStrategy
 * @property {(ctx: { prompt: string; imageSize: string; seed?: number; falExtraInput?: Record<string, unknown> }) => Record<string, unknown>} buildInput
 * @property {(input: Record<string, unknown>, promptChars: number) => Record<string, unknown>} startLogExtra
 * @property {(input: Record<string, unknown>) => Record<string, unknown>} doneLogRequestFields
 */

/** @type {FalImageEndpointStrategy} */
const fluxStrategy = {
  buildInput: buildFluxImageInput,
  startLogExtra(input, promptChars) {
    const image_size = input.image_size;
    return {
      image_size: typeof image_size === "string" ? image_size : image_size,
      seed: input.seed ?? null,
      promptChars,
    };
  },
  doneLogRequestFields(input) {
    const image_size = input.image_size;
    return {
      requestedImageSize: typeof image_size === "string" ? image_size : { .../** @type {{ width: number; height: number }} */ (image_size) },
    };
  },
};

/** @type {FalImageEndpointStrategy} */
const nanoBanana2Strategy = {
  buildInput: buildNanoBanana2ImageInput,
  startLogExtra(input, promptChars) {
    return {
      aspect_ratio: input.aspect_ratio,
      resolution: input.resolution,
      seed: input.seed ?? null,
      promptChars,
    };
  },
  doneLogRequestFields(input) {
    return {
      requestedAspectRatio: input.aspect_ratio,
      requestedResolution: input.resolution,
    };
  },
};

/**
 * @param {string} endpoint
 * @returns {FalImageEndpointStrategy}
 */
export function getFalImageEndpointStrategy(endpoint) {
  return isNanoBanana2Endpoint(endpoint) ? nanoBanana2Strategy : fluxStrategy;
}

/**
 * Subscribe only — parses **`data.images[0].url`** but does **not** download. Use to chain **BRIA** with
 * the T2I result URL without fetching the intermediate PNG (**`FALSPRITE_INTEGRATION_PLAN.md`** Phase C).
 *
 * @param {object} params
 * @param {string} params.endpoint
 * @param {Record<string, unknown>} params.input
 * @param {boolean} [params.quiet]
 * @param {(level: 'DEBUG'|'INFO'|'WARN'|'ERROR', step: string, message: string, extra?: Record<string, unknown>) => void} [params.log]
 * @param {import('@fal-ai/client').FalClient['subscribe']} [params.falSubscribe]
 * @param {(data: unknown) => { url: string; seed?: number; image0: Record<string, unknown> }} [params.parseResult]
 * @returns {Promise<{ imageUrl: string; seed?: number; wallMs: number; image0: Record<string, unknown> }>}
 */
export async function falSubscribeImageToUrlResult(params) {
  const { endpoint, input, quiet, falSubscribe, parseResult } = params;
  const log = params.log ?? defaultLog;
  const subscribe = falSubscribe ?? ((ep, opts) => fal.subscribe(ep, opts));
  const parse = parseResult ?? parseFalImageSubscribeResult;

  log("INFO", `fal:${endpoint}`, "subscribe() request input (redacted)", redactFalInputForLog(input));
  if (!quiet) {
    log("DEBUG", "fal:prompt", "full prompt follows", {});
    const p = input.prompt;
    console.log(typeof p === "string" ? p : String(p));
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
  const parsed = parse(data);
  const img0 = parsed.image0;

  log("INFO", `fal:${endpoint}`, "subscribe() URL ready (download deferred)", {
    wallMs,
    seedReturned: parsed.seed,
    urlHost: parsed.url ? new URL(parsed.url).host : "?",
  });

  return { imageUrl: parsed.url, seed: parsed.seed, wallMs, image0: img0 };
}

/**
 * Generic subscribe → download PNG → decode metadata. Prefer **`falSubscribeToBuffer`** for pipeline
 * (it picks Flux vs nano-banana-2 input shape). Use this when **`input`** is already built.
 *
 * @param {object} params
 * @param {string} params.endpoint
 * @param {Record<string, unknown>} params.input
 * @param {boolean} [params.quiet]
 * @param {(level: 'DEBUG'|'INFO'|'WARN'|'ERROR', step: string, message: string, extra?: Record<string, unknown>) => void} [params.log]
 * @param {import('@fal-ai/client').FalClient['subscribe']} [params.falSubscribe]
 * @param {typeof fetch} [params.fetch]
 * @param {(data: unknown) => { url: string; seed?: number; image0: Record<string, unknown> }} [params.parseResult]  default: **`parseFalImageSubscribeResult`**
 * @param {Record<string, unknown>} [params.doneLogExtras]  Merged into the final **`subscribe() done`** line (e.g. requested image size vs aspect ratio).
 * @returns {Promise<{ buffer: Buffer; seed?: number; wallMs: number }>}
 */
export async function falSubscribeImageToBuffer(params) {
  const { endpoint, input, quiet, falSubscribe, fetch: fetchImpl, parseResult, doneLogExtras } = params;
  const log = params.log ?? defaultLog;
  const fetchFn = fetchImpl ?? globalThis.fetch;
  const parse = parseResult ?? parseFalImageSubscribeResult;

  const urlResult = await falSubscribeImageToUrlResult({
    endpoint,
    input,
    quiet,
    log,
    falSubscribe,
    parseResult: parse,
  });

  log("INFO", `fal:${endpoint}`, "download starting", { urlHost: urlResult.imageUrl ? new URL(urlResult.imageUrl).host : "?" });
  const buffer = await downloadToBuffer(urlResult.imageUrl, fetchFn);

  const outSeed = urlResult.seed;
  const img0 = urlResult.image0;
  const pngDims = readPngBufferDimensions(buffer);
  const apiWh =
    img0 && "width" in img0 && "height" in img0
      ? { width: Number(img0.width), height: Number(img0.height) }
      : null;
  log("INFO", `fal:${endpoint}`, "subscribe() done", {
    wallMs: urlResult.wallMs,
    seedReturned: outSeed,
    bytes: buffer.length,
    falResponseImagePx: apiWh,
    pngDecodedPx: pngDims ? { width: pngDims.width, height: pngDims.height, decode: pngDims.decode } : null,
    ...(doneLogExtras && typeof doneLogExtras === "object" ? doneLogExtras : {}),
  });

  return { buffer, seed: outSeed, wallMs: urlResult.wallMs };
}

/**
 * **`fal-ai/bria/background/remove`**: HTTPS **`image_url`** in (typically T2I **`data.images[0].url`**), PNG with alpha out.
 *
 * @param {object} params
 * @param {string} params.imageUrl
 * @param {boolean} [params.quiet]
 * @param {(level: 'DEBUG'|'INFO'|'WARN'|'ERROR', step: string, message: string, extra?: Record<string, unknown>) => void} [params.log]
 * @param {import('@fal-ai/client').FalClient['subscribe']} [params.falSubscribe]
 * @param {typeof fetch} [params.fetch]
 * @returns {Promise<{ buffer: Buffer; wallMs: number }>}
 */
export async function falSubscribeBriaBackgroundRemoveToBuffer(params) {
  const { imageUrl, quiet, falSubscribe, fetch: fetchImpl } = params;
  const log = params.log ?? defaultLog;
  /** @type {Record<string, unknown>} */
  const input = { image_url: imageUrl };
  return falSubscribeImageToBuffer({
    endpoint: BRIA_BACKGROUND_REMOVE_ENDPOINT,
    input,
    quiet,
    log,
    falSubscribe,
    fetch: fetchImpl,
    parseResult: parseFalBriaBackgroundRemoveResult,
    doneLogExtras: { briaMatting: true },
  });
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

  const strategy = getFalImageEndpointStrategy(endpoint);
  const ctx = { prompt, imageSize, seed, falExtraInput };
  const input = strategy.buildInput(ctx);

  log("INFO", `fal:${endpoint}`, "subscribe() starting", {
    ...strategy.startLogExtra(input, prompt.length),
  });

  return falSubscribeImageToBuffer({
    endpoint,
    input: /** @type {Record<string, unknown>} */ (input),
    quiet,
    log,
    falSubscribe,
    fetch: fetchImpl,
    doneLogExtras: strategy.doneLogRequestFields(/** @type {Record<string, unknown>} */ (input)),
  });
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
