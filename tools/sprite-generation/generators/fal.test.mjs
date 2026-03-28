import { ApiError } from "@fal-ai/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PNG } from "pngjs";

import {
  assertPngBufferDimensions,
  downloadToBuffer,
  falSubscribeToBuffer,
  formatFalClientError,
  hashPromptForLog,
  parseImageSize,
  readPngBufferDimensions,
  redactFalInputForLog,
  resolveFalCredentials,
} from "./fal.mjs";

describe("sprite-generation fal helpers (no network)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("parseImageSize parses WxH and passes through non-matching strings", () => {
    expect(parseImageSize("256x256")).toEqual({ width: 256, height: 256 });
    expect(parseImageSize("  512x384  ")).toEqual({ width: 512, height: 384 });
    expect(parseImageSize("landscape_16_9")).toBe("landscape_16_9");
  });

  it("redactFalInputForLog hides data URIs and prompt body", () => {
    const r = redactFalInputForLog({
      prompt: "secret phrase",
      image_size: { width: 400, height: 100 },
      control_lora_image_url: "data:image/png;base64,AAAA",
      api_token: "x",
    });
    expect(r.prompt).toEqual({ length: 13, sha256Hex16: hashPromptForLog("secret phrase") });
    expect(String(r.control_lora_image_url)).toContain("data-uri");
    expect(String(r.control_lora_image_url)).toContain("payloadChars=");
    expect(r.api_token).toBe("<redacted>");
    expect(r.image_size).toEqual({ width: 400, height: 100 });
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
    const out = await downloadToBuffer("https://example.com/a.png", fetchMock);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(Buffer.compare(out, buf)).toBe(0);
  });

  it("falSubscribeToBuffer downloads image via mocked subscribe + fetch", async () => {
    const logs = [];
    const log = (level, step, message, extra) => {
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
      falSubscribe: subscribe,
      fetch: fetchMock,
    });

    expect(r.buffer.equals(pngBytes)).toBe(true);
    expect(r.seed).toBe(99);
    expect(subscribe).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(r.wallMs).toBeGreaterThanOrEqual(0);
    const done = logs.find((x) => x.message === "subscribe() done");
    expect(done?.extra?.pngDecodedPx).toEqual({ width: 1, height: 1, decode: "pngjs" });
    const req = logs.find((x) => x.message === "subscribe() request input (redacted)");
    expect(req?.extra?.image_size).toEqual({ width: 256, height: 256 });
    expect(req?.extra?.prompt).toMatchObject({ length: 4, sha256Hex16: expect.any(String) });
  });
});
