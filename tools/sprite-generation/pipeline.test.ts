import { readFile } from "node:fs/promises";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PNG } from "pngjs";

import { parseFrameKeyRectManifestJson } from "../../src/art/atlasTypes.ts";
import { buildDpadGridSpritePrompt } from "./prompt.ts";
import { hashPromptForLog } from "./generators/fal.ts";
import { RECIPE_VERSION_MOCK } from "./manifest.ts";
import { parseGridFrameKeysManifestJson } from "../../src/art/atlasTypes.ts";
// @ts-expect-error TS7016 — preset module is still `.mjs` (see epic / registry TS migration)
import { createPreset } from "./presets/dpad/dpad.mjs";
import { runPipeline, type PipelineOpts, type PipelinePreset } from "./pipeline.ts";

function dpadLikePreset(outBase: string): PipelinePreset {
  return createPreset({
    outBase,
    artUrlPrefix: "art/pipeline-test",
    provenanceTool: "tools/sprite-generation/pipeline.test.ts",
    provenanceVersion: 1,
  }) as PipelinePreset;
}

/**
 * D-pad preset with per-frame PNG output + chroma postprocess (for tests that assert cropped tiles).
 */
function dpadLikePresetPerTileOutput(outBase: string): PipelinePreset {
  const p = dpadLikePreset(outBase);
  return {
    ...p,
    sheetOnlyOutput: false,
    sheetNativeRaster: false,
    postprocessSteps: ["chromaKey"],
    spriteRef: {
      kind: "frameKeyRect",
      jsonRelativePath: "sprite-ref.json",
      artUrlPrefix: "art/pipeline-test",
      pngFilename: "dpad.png",
    },
  };
}

describe("pipeline (integration)", () => {
  let dir: string | undefined;

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
    const preset = dpadLikePresetPerTileOutput(dir);

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
    expect(parsed.frames["up"]!.width).toBe(100);
    expect(refRaw.images?.up).toBe("art/pipeline-test/up/dpad.png");
  });

  it("mock sheet + sheetOnlyOutput: sheet.png + grid sprite-ref, no per-frame PNGs", async () => {
    dir = join(tmpdir(), `pipe-mock-sheet-${process.pid}-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const preset = dpadLikePreset(dir);

    await runPipeline(preset, { mode: "mock", strategy: "sheet" });

    const sheetBuf = await readFile(join(dir, "sheet.png"));
    const sheetPng = PNG.sync.read(sheetBuf);
    expect(sheetPng.width).toBe(200);
    expect(sheetPng.height).toBe(200);

    const refRaw = JSON.parse(await readFile(join(dir, "sprite-ref.json"), "utf8"));
    expect(refRaw.image).toBe("art/pipeline-test/sheet.png");
    const gridParsed = parseGridFrameKeysManifestJson(refRaw);
    expect(gridParsed.grid.rows).toBe(2);
    expect(gridParsed.frames["up"]).toEqual({ column: 0, row: 0 });
    expect(gridParsed.frames["right"]).toEqual({ column: 1, row: 1 });

    const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
    expect(manifest.generationRecipe?.mode).toBe("mock");
    expect(manifest.generationResults?.up?.fromSheet).toBe(true);
    expect(manifest.generationResults?.up?.sheetOnly).toBe(true);
    expect(manifest.generationResults?._sheet?.strategy).toBe("sheet");
  });

  it("generate sheet + sheetNativeRaster: keeps BRIA output size; sprite-ref grid matches raster", async () => {
    vi.stubEnv("FAL_KEY", "test-key");
    dir = join(tmpdir(), `pipe-native-raster-${process.pid}-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    // D-pad preset: sheetNativeRaster + 2×2 grid (same raster behavior as avatar-character; no avatar import).
    const preset = dpadLikePreset(dir);
    expect(preset.sheetNativeRaster).toBe(true);

    const nativeW = 512;
    const nativeH = 512;
    const png = new PNG({ width: nativeW, height: nativeH, colorType: 6 });
    png.data.fill(0);
    for (let i = 3; i < png.data.length; i += 4) png.data[i] = 255;
    const pngBytes = Buffer.from(PNG.sync.write(png));

    const falSubscribe = vi.fn(async (ep: string) => {
      if (ep === "fal-ai/nano-banana-2") {
        return { data: { images: [{ url: "https://cdn.example.com/t2i.png" }] } };
      }
      if (ep === "fal-ai/bria/background/remove") {
        return { data: { image: { url: "https://cdn.example.com/bria.png" } } };
      }
      throw new Error(`unexpected endpoint ${ep}`);
    });
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("bria.png")) {
        return {
          ok: true,
          arrayBuffer: async () =>
            pngBytes.buffer.slice(pngBytes.byteOffset, pngBytes.byteOffset + pngBytes.byteLength),
        };
      }
      throw new Error(`unexpected fetch ${u}`);
    });

    await runPipeline(preset, {
      mode: "generate",
      strategy: "sheet",
      endpoint: "fal-ai/nano-banana-2",
      skipQa: true,
      quiet: true,
      sheetRewrite: false,
      keepSheet: true,
      falSubscribe: falSubscribe as unknown as NonNullable<PipelineOpts["falSubscribe"]>,
      fetch: fetchMock as unknown as typeof fetch,
    });

    const sheetBuf = await readFile(join(dir, "sheet.png"));
    const sheetPng = PNG.sync.read(sheetBuf);
    expect(sheetPng.width).toBe(512);
    expect(sheetPng.height).toBe(512);

    const refRaw = JSON.parse(await readFile(join(dir, "sprite-ref.json"), "utf8"));
    const gridParsed = parseGridFrameKeysManifestJson(refRaw);
    expect(gridParsed.grid.spriteWidth).toBe(256);
    expect(gridParsed.grid.spriteHeight).toBe(256);

    const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
    expect(manifest.specs?.tileSize?.width).toBe(256);
    expect(manifest.specs?.sheetSize?.width).toBe(512);
  });

  it("generate sheet + BRIA: mock T2I URL → BRIA → sheet.png; manifest alphaSource bria on _sheet", async () => {
    vi.stubEnv("FAL_KEY", "test-key");
    dir = join(tmpdir(), `pipe-gen-bria-${process.pid}-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const preset = dpadLikePreset(dir);

    const sheetW = 200;
    const sheetH = 200;
    const png = new PNG({ width: sheetW, height: sheetH, colorType: 6 });
    png.data.fill(0);
    for (let i = 3; i < png.data.length; i += 4) png.data[i] = 255;
    const pngBytes = Buffer.from(PNG.sync.write(png));

    const falSubscribe = vi.fn(async (ep: string) => {
      if (ep === "fal-ai/nano-banana-2") {
        return { data: { images: [{ url: "https://cdn.example.com/t2i.png" }] } };
      }
      if (ep === "fal-ai/bria/background/remove") {
        return { data: { image: { url: "https://cdn.example.com/bria.png" } } };
      }
      throw new Error(`unexpected endpoint ${ep}`);
    });
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
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
      falSubscribe: falSubscribe as unknown as NonNullable<PipelineOpts["falSubscribe"]>,
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(falSubscribe).toHaveBeenCalledTimes(2);
    const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
    expect(manifest.generationResults?._sheet?.alphaSource).toBe("bria");
    expect(manifest.generationResults?._sheet?.briaWallMs).toBeGreaterThanOrEqual(0);
    expect(manifest.generationResults?._sheet?.rewriteModel).toBeUndefined();
    expect(manifest.generationResults?.up?.alphaSource).toBe("bria");
    expect(manifest.generationResults?.up?.chromaApplied).toBe(false);

    const sheetBuf = await readFile(join(dir, "sheet.png"));
    const sheetPng = PNG.sync.read(sheetBuf);
    expect(sheetPng.width).toBe(200);
    expect(sheetPng.height).toBe(200);
  });

  it("generate sheet + BRIA + chromaAfterBria opt-in: per-tile chroma runs after BRIA crops", async () => {
    vi.stubEnv("FAL_KEY", "test-key");
    dir = join(tmpdir(), `pipe-gen-bria-chroma-${process.pid}-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const preset = dpadLikePresetPerTileOutput(dir);

    const sheetW = 200;
    const sheetH = 200;
    const png = new PNG({ width: sheetW, height: sheetH, colorType: 6 });
    png.data.fill(0);
    for (let i = 3; i < png.data.length; i += 4) png.data[i] = 255;
    const pngBytes = Buffer.from(PNG.sync.write(png));

    const falSubscribe = vi.fn(async (ep: string) => {
      if (ep === "fal-ai/nano-banana-2") {
        return { data: { images: [{ url: "https://cdn.example.com/t2i.png" }] } };
      }
      if (ep === "fal-ai/bria/background/remove") {
        return { data: { image: { url: "https://cdn.example.com/bria.png" } } };
      }
      throw new Error(`unexpected endpoint ${ep}`);
    });
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
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
      falSubscribe: falSubscribe as unknown as NonNullable<PipelineOpts["falSubscribe"]>,
      fetch: fetchMock as unknown as typeof fetch,
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

    const sheetW = 200;
    const sheetH = 200;
    const png = new PNG({ width: sheetW, height: sheetH, colorType: 6 });
    png.data.fill(0);
    for (let i = 3; i < png.data.length; i += 4) png.data[i] = 255;
    const pngBytes = Buffer.from(PNG.sync.write(png));

    let t2iInput: Record<string, unknown> | undefined;
    const falSubscribe = vi.fn(async (ep: string, opts?: { input?: unknown }) => {
      if (ep === "fal-ai/nano-banana-2/rc") {
        t2iInput = opts?.input && typeof opts.input === "object" ? (opts.input as Record<string, unknown>) : undefined;
        return { data: { images: [{ url: "https://cdn.example.com/t2i.png" }] } };
      }
      if (ep === "fal-ai/bria/background/remove") {
        return { data: { image: { url: "https://cdn.example.com/bria.png" } } };
      }
      throw new Error(`unexpected endpoint ${ep}`);
    });
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
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
      falSubscribe: falSubscribe as unknown as NonNullable<PipelineOpts["falSubscribe"]>,
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(t2iInput?.["aspect_ratio"]).toBe("1:1");
    expect(t2iInput?.["resolution"]).toBe("0.5K");
  });

  it("generate sheet + BRIA + rewrite: openrouter then T2I; manifest records rewriteModel and rewrittenPromptFingerprint", async () => {
    vi.stubEnv("FAL_KEY", "test-key");
    dir = join(tmpdir(), `pipe-gen-rewrite-${process.pid}-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const preset = dpadLikePreset(dir);

    const sheetW = 200;
    const sheetH = 200;
    const png = new PNG({ width: sheetW, height: sheetH, colorType: 6 });
    png.data.fill(0);
    for (let i = 3; i < png.data.length; i += 4) png.data[i] = 255;
    const pngBytes = Buffer.from(PNG.sync.write(png));

    const rewritten = "REWRITTEN_SHEET_PROMPT_FOR_T2I";
    let t2iInput: Record<string, unknown> | undefined;
    const falSubscribe = vi.fn(async (ep: string, opts?: { input?: unknown }) => {
      if (ep === "openrouter/router") {
        return { data: { output: rewritten } };
      }
      if (ep === "fal-ai/nano-banana-2") {
        t2iInput = opts?.input && typeof opts.input === "object" ? (opts.input as Record<string, unknown>) : undefined;
        return { data: { images: [{ url: "https://cdn.example.com/t2i.png" }] } };
      }
      if (ep === "fal-ai/bria/background/remove") {
        return { data: { image: { url: "https://cdn.example.com/bria.png" } } };
      }
      throw new Error(`unexpected endpoint ${ep}`);
    });
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
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
      falSubscribe: falSubscribe as unknown as NonNullable<PipelineOpts["falSubscribe"]>,
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(falSubscribe).toHaveBeenCalledTimes(3);
    expect(String(t2iInput?.["prompt"])).toContain(rewritten);
    const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
    const sheet = manifest.generationResults?._sheet;
    expect(sheet?.rewriteModel).toBe("openai/gpt-4o-mini");
    expect(sheet?.rewrittenPromptFingerprint).toBe(hashPromptForLog(buildDpadGridSpritePrompt(rewritten, 2)));
    expect(sheet?.rewriteWallMs).toBeGreaterThanOrEqual(0);
  });
});
