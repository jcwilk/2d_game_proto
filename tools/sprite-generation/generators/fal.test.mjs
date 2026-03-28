import { ApiError } from "@fal-ai/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  downloadToBuffer,
  falSubscribeToBuffer,
  formatFalClientError,
  parseImageSize,
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
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
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
  });
});
