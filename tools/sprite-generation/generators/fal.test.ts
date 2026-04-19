import { ApiError, type FalClient } from "@fal-ai/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PNG } from "pngjs";

import type { LogFn } from "./types.ts";
import {
  assertPngBufferDimensions,
  BRIA_BACKGROUND_REMOVE_ENDPOINT,
  downloadToBuffer,
  falSubscribeBriaBackgroundRemoveToBuffer,
  falSubscribeImageToBuffer,
  falSubscribeImageToUrlResult,
  falSubscribeToBuffer,
  formatFalClientError,
  getFalImageEndpointStrategy,
  hashPromptForLog,
  isNanoBanana2Endpoint,
  sameImageEndpointFamily,
  parseFalBriaBackgroundRemoveResult,
  parseFalImageSubscribeResult,
  OPENROUTER_ROUTER_ENDPOINT,
  parseImageSize,
  parseOpenRouterRouterOutput,
  readPngBufferDimensions,
  redactFalInputForLog,
  resolveFalCredentials,
  rewritePromptViaOpenRouter,
  shouldUseBriaSheetMatting,
  NANO_BANANA2_DEFAULT_ASPECT_RATIO,
  NANO_BANANA2_DEFAULT_RESOLUTION,
} from "./fal.ts";

function mockSubscribe(fn: ReturnType<typeof vi.fn>): FalClient["subscribe"] {
  return fn as unknown as FalClient["subscribe"];
}

function mockFetchFn(fn: ReturnType<typeof vi.fn>): typeof fetch {
  return fn as unknown as typeof fetch;
}

describe("sprite-generation fal helpers (no network)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("parseImageSize parses WxH and passes through non-matching strings", () => {
    expect(parseImageSize("256x256")).toEqual({ width: 256, height: 256 });
    expect(parseImageSize("  512x384  ")).toEqual({ width: 512, height: 384 });
    expect(parseImageSize("landscape_16_9")).toBe("landscape_16_9");
  });

  it("isNanoBanana2Endpoint matches fal-ai/nano-banana-2 family", () => {
    expect(isNanoBanana2Endpoint("fal-ai/nano-banana-2")).toBe(true);
    expect(isNanoBanana2Endpoint("fal-ai/nano-banana-2/rc")).toBe(true);
    expect(isNanoBanana2Endpoint("fal-ai/flux/dev")).toBe(false);
  });

  it("sameImageEndpointFamily groups nano-banana ids and Flux-shaped endpoints", () => {
    expect(sameImageEndpointFamily("fal-ai/nano-banana-2", "fal-ai/nano-banana-2/experimental")).toBe(true);
    expect(sameImageEndpointFamily("fal-ai/flux/dev", "fal-ai/flux/schnell")).toBe(true);
    expect(sameImageEndpointFamily("fal-ai/nano-banana-2", "fal-ai/flux/dev")).toBe(false);
  });

  it("shouldUseBriaSheetMatting respects preset.fal.sheetMatting and endpoint", () => {
    expect(shouldUseBriaSheetMatting({}, "fal-ai/nano-banana-2")).toBe(true);
    expect(shouldUseBriaSheetMatting({ fal: { sheetMatting: "none" } }, "fal-ai/nano-banana-2")).toBe(false);
    expect(shouldUseBriaSheetMatting({ fal: { sheetMatting: "bria" } }, "fal-ai/flux/dev")).toBe(true);
    expect(shouldUseBriaSheetMatting({}, "fal-ai/flux/dev")).toBe(false);
  });

  it("getFalImageEndpointStrategy selects nano vs flux builders", () => {
    expect(getFalImageEndpointStrategy("fal-ai/nano-banana-2")).not.toBe(
      getFalImageEndpointStrategy("fal-ai/flux/dev"),
    );
  });

  it("parseOpenRouterRouterOutput reads output text and surfaces error field", () => {
    expect(parseOpenRouterRouterOutput({ output: "  hello  " })).toBe("hello");
    expect(() => parseOpenRouterRouterOutput({})).toThrow("no output");
    expect(() => parseOpenRouterRouterOutput({ error: "bad" })).toThrow("bad");
  });

  it("rewritePromptViaOpenRouter calls openrouter/router and returns trimmed text", async () => {
    const subscribe = vi.fn(async () => ({
      data: { output: "  rewritten prompt  " },
    }));
    const r = await rewritePromptViaOpenRouter({
      userPrompt: "user",
      systemPrompt: "sys",
      model: "openai/gpt-4o-mini",
      falSubscribe: mockSubscribe(subscribe),
      quiet: true,
    });
    expect(r.text).toBe("rewritten prompt");
    expect(subscribe).toHaveBeenCalledWith(
      OPENROUTER_ROUTER_ENDPOINT,
      expect.objectContaining({
        input: expect.objectContaining({ prompt: "user", system_prompt: "sys", model: "openai/gpt-4o-mini" }),
      }),
    );
  });

  it("parseFalBriaBackgroundRemoveResult reads image.url (BRIA output schema)", () => {
    const p = parseFalBriaBackgroundRemoveResult({
      image: { url: "https://v3.fal.media/out.png", width: 100, height: 100 },
    });
    expect(p.url).toBe("https://v3.fal.media/out.png");
    expect(p.image0["width"]).toBe(100);
  });

  it("parseFalImageSubscribeResult reads images[0].url from fixture-shaped data", () => {
    const fixture = {
      images: [{ url: "https://cdn.example.com/n.png", width: 400, height: 100 }],
      seed: 42,
    };
    const p = parseFalImageSubscribeResult(fixture);
    expect(p.url).toBe("https://cdn.example.com/n.png");
    expect(p.seed).toBe(42);
    expect(p.image0["width"]).toBe(400);
  });

  it("redactFalInputForLog hides data URIs and prompt body", () => {
    const r = redactFalInputForLog({
      prompt: "secret phrase",
      system_prompt: "system hidden",
      image_size: { width: 400, height: 100 },
      control_lora_image_url: "data:image/png;base64,AAAA",
      api_token: "x",
    });
    expect(r["prompt"]).toEqual({ length: 13, sha256Hex16: hashPromptForLog("secret phrase") });
    expect(r["system_prompt"]).toEqual({ length: 13, sha256Hex16: hashPromptForLog("system hidden") });
    expect(String(r["control_lora_image_url"])).toContain("data-uri");
    expect(String(r["control_lora_image_url"])).toContain("payloadChars=");
    expect(r["api_token"]).toBe("<redacted>");
    expect(r["image_size"]).toEqual({ width: 400, height: 100 });
  });

  it("redactFalInputForLog treats any *_url string like control image URLs", () => {
    const r = redactFalInputForLog({
      image_url: "https://example.com/secret.png?token=abc",
    });
    expect(String(r["image_url"])).toContain("host=example.com");
    expect(String(r["image_url"])).not.toContain("token=");
  });

  it("assertPngBufferDimensions passes on exact WxH and throws with stage label on mismatch", () => {
    const png = new PNG({ width: 100, height: 100, colorType: 6 });
    png.data.fill(0);
    for (let i = 3; i < png.data.length; i += 4) png.data[i] = 255;
    const ok = PNG.sync.write(png);
    assertPngBufferDimensions(ok, 100, 100, "test:ok");
    expect(() => assertPngBufferDimensions(ok, 99, 100, "test:bad")).toThrow(
      "test:bad: expected 99x100, got 100x100",
    );
  });

  it("readPngBufferDimensions reads pngjs and IHDR fallback", () => {
    const one = new PNG({ width: 17, height: 19 });
    one.data.fill(0);
    for (let i = 3; i < one.data.length; i += 4) one.data[i] = 255;
    const bytes = PNG.sync.write(one);
    const d = readPngBufferDimensions(bytes);
    expect(d).toEqual({ width: 17, height: 19, decode: "pngjs" });

    expect(readPngBufferDimensions(Buffer.from([1, 2, 3]))).toBeNull();
  });

  it("resolveFalCredentials reads FAL_KEY or FAL_KEY_ID + FAL_KEY_SECRET", () => {
    vi.stubEnv("FAL_KEY", "");
    vi.stubEnv("FAL_KEY_ID", "kid");
    vi.stubEnv("FAL_KEY_SECRET", "secret");
    expect(resolveFalCredentials()).toBe("kid:secret");

    vi.stubEnv("FAL_KEY", "  direct-key  ");
    vi.stubEnv("FAL_KEY_ID", "kid");
    vi.stubEnv("FAL_KEY_SECRET", "secret");
    expect(resolveFalCredentials()).toBe("direct-key");
  });

  it("formatFalClientError includes ApiError body detail and request id", () => {
    const withDetail = new ApiError({
      message: "Bad",
      status: 400,
      body: { detail: "nope" },
      requestId: "",
    });
    expect(formatFalClientError(withDetail)).toContain("nope");

    const withReq = new ApiError({
      message: "Err",
      status: 500,
      body: {},
      requestId: "req-123",
    });
    expect(formatFalClientError(withReq)).toContain("req-123");
  });

  it("formatFalClientError falls back for non-ApiError", () => {
    expect(formatFalClientError(new Error("plain"))).toBe("plain");
    expect(formatFalClientError("x")).toBe("x");
  });

  it("downloadToBuffer uses injected fetch", async () => {
    const buf = Buffer.from([1, 2, 3]);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    }));
    const out = await downloadToBuffer("https://example.com/a.png", mockFetchFn(fetchMock));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(Buffer.compare(out, buf)).toBe(0);
  });

  it("falSubscribeToBuffer downloads image via mocked subscribe + fetch", async () => {
    const logs: Array<{ level: string; step: string; message: string; extra?: Record<string, unknown> }> = [];
    const log: LogFn = (level, step, message, extra) => {
      logs.push({ level, step, message, extra });
    };
    const subscribe = vi.fn(async () => ({
      data: {
        images: [{ url: "https://cdn.example.com/out.png" }],
        seed: 99,
      },
    }));
    const pngOne = new PNG({ width: 1, height: 1 });
    pngOne.data[0] = pngOne.data[1] = pngOne.data[2] = 0;
    pngOne.data[3] = 255;
    const pngBytes = Buffer.from(PNG.sync.write(pngOne));
    const fetchMock = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () =>
        pngBytes.buffer.slice(pngBytes.byteOffset, pngBytes.byteOffset + pngBytes.byteLength),
    }));

    const r = await falSubscribeToBuffer({
      endpoint: "fal-ai/flux/dev",
      prompt: "test",
      imageSize: "256x256",
      seed: 1,
      quiet: true,
      log,
      falSubscribe: mockSubscribe(subscribe),
      fetch: mockFetchFn(fetchMock),
    });

    expect(r.buffer.equals(pngBytes)).toBe(true);
    expect(r.seed).toBe(99);
    expect(subscribe).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(r.wallMs).toBeGreaterThanOrEqual(0);
    const done = logs.find((x) => x.message === "subscribe() done");
    expect(done?.extra?.["pngDecodedPx"]).toEqual({ width: 1, height: 1, decode: "pngjs" });
    expect(done?.extra?.["requestedImageSize"]).toEqual({ width: 256, height: 256 });
    const req = logs.find((x) => x.message === "subscribe() request input (redacted)");
    expect(req?.extra?.["image_size"]).toEqual({ width: 256, height: 256 });
    expect(req?.extra?.["prompt"]).toMatchObject({ length: 4, sha256Hex16: expect.any(String) });
  });

  it("falSubscribeToBuffer for fal-ai/nano-banana-2 sends aspect_ratio and resolution, not image_size", async () => {
    const captured: unknown[] = [];
    const subscribe = vi.fn(async (_ep: string, opts: { input: unknown }) => {
      captured.push(opts.input);
      return {
        data: {
          images: [{ url: "https://cdn.example.com/banana.png" }],
          seed: 7,
        },
      };
    });
    const pngOne = new PNG({ width: 1, height: 1 });
    pngOne.data[0] = pngOne.data[1] = pngOne.data[2] = 0;
    pngOne.data[3] = 255;
    const pngBytes = Buffer.from(PNG.sync.write(pngOne));
    const fetchMock = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () =>
        pngBytes.buffer.slice(pngBytes.byteOffset, pngBytes.byteOffset + pngBytes.byteLength),
    }));

    await falSubscribeToBuffer({
      endpoint: "fal-ai/nano-banana-2",
      prompt: "sheet prompt",
      imageSize: "400x100",
      quiet: true,
      falSubscribe: mockSubscribe(subscribe),
      fetch: mockFetchFn(fetchMock),
    });

    expect(subscribe).toHaveBeenCalledWith(
      "fal-ai/nano-banana-2",
      expect.objectContaining({ input: expect.any(Object) }),
    );
    const input = captured[0] as Record<string, unknown>;
    expect(input["aspect_ratio"]).toBe(NANO_BANANA2_DEFAULT_ASPECT_RATIO);
    expect(input["resolution"]).toBe(NANO_BANANA2_DEFAULT_RESOLUTION);
    expect(input["output_format"]).toBe("png");
    expect(input["num_images"]).toBe(1);
    expect(input["image_size"]).toBeUndefined();
    expect("image_size" in input).toBe(false);
  });

  it("falSubscribeToBuffer nano-banana-2 merges falExtraInput over defaults", async () => {
    const subscribe = vi.fn(async () => ({
      data: { images: [{ url: "https://cdn.example.com/x.png" }] },
    }));
    const pngOne = new PNG({ width: 1, height: 1 });
    pngOne.data[0] = pngOne.data[1] = pngOne.data[2] = 0;
    pngOne.data[3] = 255;
    const pngBytes = Buffer.from(PNG.sync.write(pngOne));
    const fetchMock = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () =>
        pngBytes.buffer.slice(pngBytes.byteOffset, pngBytes.byteOffset + pngBytes.byteLength),
    }));

    await falSubscribeToBuffer({
      endpoint: "fal-ai/nano-banana-2",
      prompt: "p",
      imageSize: "256x256",
      quiet: true,
      falExtraInput: { aspect_ratio: "1:1", resolution: "2K" },
      falSubscribe: mockSubscribe(subscribe),
      fetch: mockFetchFn(fetchMock),
    });

    const firstCall = subscribe.mock.calls[0] as unknown as [string, { input: Record<string, unknown> }] | undefined;
    expect(firstCall).toBeDefined();
    const input = firstCall![1].input;
    expect(input["aspect_ratio"]).toBe("1:1");
    expect(input["resolution"]).toBe("2K");
  });

  it("falSubscribeImageToBuffer accepts pre-built input and uses parseFalImageSubscribeResult", async () => {
    const subscribe = vi.fn(async () => ({
      data: { images: [{ url: "https://cdn.example.com/direct.png" }] },
    }));
    const pngOne = new PNG({ width: 2, height: 2 });
    pngOne.data.fill(0);
    for (let i = 3; i < pngOne.data.length; i += 4) pngOne.data[i] = 255;
    const pngBytes = Buffer.from(PNG.sync.write(pngOne));
    const fetchMock = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () =>
        pngBytes.buffer.slice(pngBytes.byteOffset, pngBytes.byteOffset + pngBytes.byteLength),
    }));

    const r = await falSubscribeImageToBuffer({
      endpoint: "fal-ai/nano-banana-2",
      input: {
        prompt: "x",
        aspect_ratio: "4:1",
        resolution: "1K",
        num_images: 1,
        output_format: "png",
      },
      quiet: true,
      falSubscribe: mockSubscribe(subscribe),
      fetch: mockFetchFn(fetchMock),
    });
    expect(r.buffer.length).toBeGreaterThan(0);
    expect(subscribe).toHaveBeenCalledOnce();
  });

  it("falSubscribeImageToUrlResult returns URL without downloading", async () => {
    const subscribe = vi.fn(async () => ({
      data: { images: [{ url: "https://cdn.example.com/only-url.png" }], seed: 3 },
    }));
    const r = await falSubscribeImageToUrlResult({
      endpoint: "fal-ai/flux/dev",
      input: { prompt: "x", image_size: { width: 1, height: 1 }, num_images: 1, output_format: "png" },
      quiet: true,
      falSubscribe: mockSubscribe(subscribe),
    });
    expect(r.imageUrl).toBe("https://cdn.example.com/only-url.png");
    expect(r.seed).toBe(3);
  });

  it("falSubscribeBriaBackgroundRemoveToBuffer calls BRIA endpoint with image_url", async () => {
    const captured: Array<{ ep: string; input: Record<string, unknown> }> = [];
    const subscribe = vi.fn(async (ep: string, opts: { input: Record<string, unknown> }) => {
      captured.push({ ep, input: opts.input });
      return {
        data: { image: { url: "https://cdn.example.com/matted.png", width: 2, height: 2 } },
      };
    });
    const pngOne = new PNG({ width: 2, height: 2 });
    pngOne.data.fill(0);
    for (let i = 3; i < pngOne.data.length; i += 4) pngOne.data[i] = 255;
    const pngBytes = Buffer.from(PNG.sync.write(pngOne));
    const fetchMock = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () =>
        pngBytes.buffer.slice(pngBytes.byteOffset, pngBytes.byteOffset + pngBytes.byteLength),
    }));

    await falSubscribeBriaBackgroundRemoveToBuffer({
      imageUrl: "https://cdn.example.com/in.png",
      quiet: true,
      falSubscribe: mockSubscribe(subscribe),
      fetch: mockFetchFn(fetchMock),
    });

    expect(subscribe).toHaveBeenCalledWith(
      BRIA_BACKGROUND_REMOVE_ENDPOINT,
      expect.objectContaining({ input: expect.any(Object) }),
    );
    expect(captured[0]!.input["image_url"]).toBe("https://cdn.example.com/in.png");
    expect(fetchMock).toHaveBeenCalled();
  });
});
