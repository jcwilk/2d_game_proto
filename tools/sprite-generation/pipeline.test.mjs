import { readFile } from "node:fs/promises";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PNG } from "pngjs";

import { parseFrameKeyRectManifestJson } from "../../src/art/atlasTypes.ts";
import { hashPromptForLog } from "./generators/fal.mjs";
import { RECIPE_VERSION_MOCK } from "./manifest.mjs";
import { createPreset } from "./presets/dpad.mjs";
import { runPipeline } from "./pipeline.mjs";

/** @param {string} outBase */
function dpadLikePreset(outBase) {
  return createPreset({
    outBase,
    artUrlPrefix: "art/pipeline-test",
    provenanceTool: "tools/sprite-generation/pipeline.test.mjs",
    provenanceVersion: 1,
  });
}

describe("pipeline (integration)", () => {
  /** @type {string | undefined} */
  let dir;

  afterEach(async () => {
    vi.unstubAllEnvs();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
      dir = undefined;
    }
  });

  it("mock per-tile: PNGs, manifest, sprite-ref, png-analyze sidecars under tmpdir", async () => {
    dir = join(tmpdir(), `pipe-mock-tile-${process.pid}-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const preset = dpadLikePreset(dir);

    const result = await runPipeline(preset, { mode: "mock", strategy: "per-tile" });

    expect(result.manifestPath).toBe(join(dir, "manifest.json"));
    expect(result.spriteRefPath).toBe(join(dir, "sprite-ref.json"));

    for (const id of ["up", "down", "left", "right"]) {
      const pngPath = join(dir, id, "dpad.png");
      const buf = await readFile(pngPath);
      const png = PNG.sync.read(buf);
      expect(png.width).toBe(100);
      expect(png.height).toBe(100);

      const qaPath = join(dir, id, "png-analyze.json");
      const qaRaw = JSON.parse(await readFile(qaPath, "utf8"));
      expect(qaRaw.dimensions?.width).toBe(100);
      expect(qaRaw.dimensions?.height).toBe(100);
    }

    const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
    expect(manifest.recipeId).toBe(`sprite-gen-dpad_four_way-mock-${RECIPE_VERSION_MOCK}`);
    expect(manifest.preset).toBe("dpad_four_way");
    expect(manifest.generationResults?.up?.chromaApplied).toBe(false);

    const refRaw = JSON.parse(await readFile(join(dir, "sprite-ref.json"), "utf8"));
    const parsed = parseFrameKeyRectManifestJson(refRaw);
    expect(parsed.frames["up"].width).toBe(100);
    expect(refRaw.images?.up).toBe("art/pipeline-test/up/dpad.png");
  });

  it("mock sheet + crop: four tiles from one mock sheet, manifest records sheet strategy metadata", async () => {
    dir = join(tmpdir(), `pipe-mock-sheet-${process.pid}-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const preset = dpadLikePreset(dir);

    await runPipeline(preset, { mode: "mock", strategy: "sheet" });

    for (const id of ["up", "down", "left", "right"]) {
      const pngPath = join(dir, id, "dpad.png");
      const buf = await readFile(pngPath);
      const png = PNG.sync.read(buf);
      expect(png.width).toBe(100);
      expect(png.height).toBe(100);
    }

    const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
    expect(manifest.generationRecipe?.mode).toBe("mock");
    expect(manifest.generationResults?.up?.fromSheet).toBe(true);
    expect(manifest.generationResults?._sheet?.strategy).toBe("sheet");
  });

  it("generate sheet + BRIA: mock T2I URL → BRIA → RGBA tiles; manifest alphaSource bria on _sheet", async () => {
    vi.stubEnv("FAL_KEY", "test-key");
    dir = join(tmpdir(), `pipe-gen-bria-${process.pid}-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const preset = dpadLikePreset(dir);

    const sheetW = 400;
    const sheetH = 100;
    const png = new PNG({ width: sheetW, height: sheetH, colorType: 6 });
    png.data.fill(0);
    for (let i = 3; i < png.data.length; i += 4) png.data[i] = 255;
    const pngBytes = Buffer.from(PNG.sync.write(png));

    const falSubscribe = vi.fn(async (ep) => {
      if (ep === "fal-ai/nano-banana-2") {
        return { data: { images: [{ url: "https://cdn.example.com/t2i.png" }] } };
      }
      if (ep === "fal-ai/bria/background/remove") {
        return { data: { image: { url: "https://cdn.example.com/bria.png" } } };
      }
      throw new Error(`unexpected endpoint ${ep}`);
    });
    const fetchMock = vi.fn(async (url) => {
      const u = String(url);
      if (u.includes("t2i.png")) {
        throw new Error("T2I PNG should not be downloaded when BRIA matting is used");
      }
      if (u.includes("bria.png")) {
        return {
          ok: true,
          arrayBuffer: async () =>
            pngBytes.buffer.slice(pngBytes.byteOffset, pngBytes.byteOffset + pngBytes.byteLength),
        };
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    await runPipeline(preset, {
      mode: "generate",
      strategy: "sheet",
      endpoint: "fal-ai/nano-banana-2",
      skipQa: true,
      quiet: true,
      sheetRewrite: false,
      falSubscribe,
      fetch: fetchMock,
    });

    expect(falSubscribe).toHaveBeenCalledTimes(2);
    const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
    expect(manifest.generationResults?._sheet?.alphaSource).toBe("bria");
    expect(manifest.generationResults?._sheet?.briaWallMs).toBeGreaterThanOrEqual(0);
    expect(manifest.generationResults?._sheet?.rewriteModel).toBeUndefined();
    expect(manifest.generationResults?.up?.alphaSource).toBe("bria");
    expect(manifest.generationResults?.up?.chromaApplied).toBe(false);

    const upBuf = await readFile(join(dir, "up", "dpad.png"));
    const upPng = PNG.sync.read(upBuf);
    expect(upPng.width).toBe(100);
    expect(upPng.height).toBe(100);
  });

  it("generate sheet + BRIA + chromaAfterBria opt-in: per-tile chroma runs after BRIA crops", async () => {
    vi.stubEnv("FAL_KEY", "test-key");
    dir = join(tmpdir(), `pipe-gen-bria-chroma-${process.pid}-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const preset = dpadLikePreset(dir);

    const sheetW = 400;
    const sheetH = 100;
    const png = new PNG({ width: sheetW, height: sheetH, colorType: 6 });
    png.data.fill(0);
    for (let i = 3; i < png.data.length; i += 4) png.data[i] = 255;
    const pngBytes = Buffer.from(PNG.sync.write(png));

    const falSubscribe = vi.fn(async (ep) => {
      if (ep === "fal-ai/nano-banana-2") {
        return { data: { images: [{ url: "https://cdn.example.com/t2i.png" }] } };
      }
      if (ep === "fal-ai/bria/background/remove") {
        return { data: { image: { url: "https://cdn.example.com/bria.png" } } };
      }
      throw new Error(`unexpected endpoint ${ep}`);
    });
    const fetchMock = vi.fn(async (url) => {
      const u = String(url);
      if (u.includes("bria.png")) {
        return {
          ok: true,
          arrayBuffer: async () =>
            pngBytes.buffer.slice(pngBytes.byteOffset, pngBytes.byteOffset + pngBytes.byteLength),
        };
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    await runPipeline(preset, {
      mode: "generate",
      strategy: "sheet",
      endpoint: "fal-ai/nano-banana-2",
      skipQa: true,
      quiet: true,
      sheetRewrite: false,
      chromaAfterBria: true,
      falSubscribe,
      fetch: fetchMock,
    });

    const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
    expect(manifest.generationResults?._sheet?.alphaSource).toBe("bria");
    expect(manifest.generationResults?.up?.chromaApplied).toBe(true);
  });

  it("generate sheet: preset falExtrasSheet merges when --endpoint is same nano-banana family (not exact string)", async () => {
    vi.stubEnv("FAL_KEY", "test-key");
    dir = join(tmpdir(), `pipe-gen-family-${process.pid}-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const preset = dpadLikePreset(dir);

    const sheetW = 400;
    const sheetH = 100;
    const png = new PNG({ width: sheetW, height: sheetH, colorType: 6 });
    png.data.fill(0);
    for (let i = 3; i < png.data.length; i += 4) png.data[i] = 255;
    const pngBytes = Buffer.from(PNG.sync.write(png));

    /** @type {Record<string, unknown> | undefined} */
    let t2iInput;
    const falSubscribe = vi.fn(async (ep, opts) => {
      if (ep === "fal-ai/nano-banana-2/rc") {
        t2iInput = opts?.input && typeof opts.input === "object" ? /** @type {Record<string, unknown>} */ (opts.input) : undefined;
        return { data: { images: [{ url: "https://cdn.example.com/t2i.png" }] } };
      }
      if (ep === "fal-ai/bria/background/remove") {
        return { data: { image: { url: "https://cdn.example.com/bria.png" } } };
      }
      throw new Error(`unexpected endpoint ${ep}`);
    });
    const fetchMock = vi.fn(async (url) => {
      const u = String(url);
      if (u.includes("bria.png")) {
        return {
          ok: true,
          arrayBuffer: async () =>
            pngBytes.buffer.slice(pngBytes.byteOffset, pngBytes.byteOffset + pngBytes.byteLength),
        };
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    await runPipeline(preset, {
      mode: "generate",
      strategy: "sheet",
      endpoint: "fal-ai/nano-banana-2/rc",
      skipQa: true,
      quiet: true,
      sheetRewrite: false,
      falSubscribe,
      fetch: fetchMock,
    });

    expect(t2iInput?.aspect_ratio).toBe("4:1");
    expect(t2iInput?.resolution).toBe("1K");
  });

  it("generate sheet + BRIA + rewrite: openrouter then T2I; manifest records rewriteModel and rewrittenPromptFingerprint", async () => {
    vi.stubEnv("FAL_KEY", "test-key");
    dir = join(tmpdir(), `pipe-gen-rewrite-${process.pid}-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const preset = dpadLikePreset(dir);

    const sheetW = 400;
    const sheetH = 100;
    const png = new PNG({ width: sheetW, height: sheetH, colorType: 6 });
    png.data.fill(0);
    for (let i = 3; i < png.data.length; i += 4) png.data[i] = 255;
    const pngBytes = Buffer.from(PNG.sync.write(png));

    const rewritten = "REWRITTEN_SHEET_PROMPT_FOR_T2I";
    /** @type {Record<string, unknown> | undefined} */
    let t2iInput;
    const falSubscribe = vi.fn(async (ep, opts) => {
      if (ep === "openrouter/router") {
        return { data: { output: rewritten } };
      }
      if (ep === "fal-ai/nano-banana-2") {
        t2iInput = opts?.input && typeof opts.input === "object" ? /** @type {Record<string, unknown>} */ (opts.input) : undefined;
        return { data: { images: [{ url: "https://cdn.example.com/t2i.png" }] } };
      }
      if (ep === "fal-ai/bria/background/remove") {
        return { data: { image: { url: "https://cdn.example.com/bria.png" } } };
      }
      throw new Error(`unexpected endpoint ${ep}`);
    });
    const fetchMock = vi.fn(async (url) => {
      const u = String(url);
      if (u.includes("bria.png")) {
        return {
          ok: true,
          arrayBuffer: async () =>
            pngBytes.buffer.slice(pngBytes.byteOffset, pngBytes.byteOffset + pngBytes.byteLength),
        };
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    await runPipeline(preset, {
      mode: "generate",
      strategy: "sheet",
      endpoint: "fal-ai/nano-banana-2",
      skipQa: true,
      quiet: true,
      sheetRewrite: true,
      falSubscribe,
      fetch: fetchMock,
    });

    expect(falSubscribe).toHaveBeenCalledTimes(3);
    expect(t2iInput?.prompt).toBe(rewritten);
    const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
    const sheet = manifest.generationResults?._sheet;
    expect(sheet?.rewriteModel).toBe("openai/gpt-4o-mini");
    expect(sheet?.rewrittenPromptFingerprint).toBe(hashPromptForLog(rewritten));
    expect(sheet?.rewriteWallMs).toBeGreaterThanOrEqual(0);
  });
});
