import { readFile } from "node:fs/promises";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PNG } from "pngjs";

import { parseFrameKeyRectManifestJson } from "../../src/art/atlasTypes.ts";
import { RECIPE_VERSION_MOCK } from "./manifest.mjs";
import { runPipeline } from "./pipeline.mjs";
import {
  DPAD_FRAME_COMPOSITION,
  DPAD_FRAME_STYLE,
  DPAD_SHEET_COMPOSITION,
  DPAD_SHEET_STYLE,
  DPAD_SHEET_SUBJECT,
} from "./prompt.mjs";

const FAL_EXTRAS_TILE = {
  num_inference_steps: 40,
  guidance_scale: 4.5,
  acceleration: "none",
};

/** Same frame list and prompt variants as `DPAD_FRAMES` in `tools/dpad-workflow.mjs`. */
const DPAD_LIKE_FRAMES = [
  {
    id: "up",
    outSubdir: "up",
    promptVariant:
      `Orientation NORTH (up): one isosceles triangle only, pointing straight up. ` +
      `Apex sits on the top edge at horizontal center; the base is a horizontal segment below the apex, parallel to the bottom edge. ` +
      `Flat 2D orthographic symbol only — no perspective, no 3D block, no extrusion, no chevron pair.`,
  },
  {
    id: "down",
    outSubdir: "down",
    promptVariant:
      `Orientation SOUTH (down): one isosceles triangle only, pointing straight down. ` +
      `Apex sits on the bottom edge at horizontal center; the base is a horizontal segment above the apex. ` +
      `Flat 2D orthographic symbol only — no perspective, no 3D block, no extrusion, no chevron pair.`,
  },
  {
    id: "left",
    outSubdir: "left",
    promptVariant:
      `Orientation WEST (left): one isosceles triangle only, pointing straight left toward the left edge. ` +
      `The tip touches the left edge at vertical midline; the base is a vertical segment on the right half of the tile. ` +
      `The triangle must be wider than tall (landscape), not a tall vertical sliver. ` +
      `Do not draw an upward or downward arrow; this is a horizontal-left control glyph. ` +
      `Flat 2D orthographic symbol only — no perspective, no 3D block.`,
  },
  {
    id: "right",
    outSubdir: "right",
    promptVariant:
      `Orientation EAST (right): one isosceles triangle only, pointing straight right toward the right edge. ` +
      `The tip touches the right edge at vertical midline; the base is a vertical segment on the left half of the tile. ` +
      `The triangle must be wider than tall (landscape), not a tall vertical sliver. ` +
      `Do not draw an upward, downward, or leftward arrow. ` +
      `Flat 2D orthographic symbol only — no perspective, no 3D block.`,
  },
];

const SHEET_CROPS = {
  up: { x: 0, y: 0 },
  right: { x: 256, y: 0 },
  left: { x: 0, y: 256 },
  down: { x: 256, y: 256 },
};

/** @param {string} outBase */
function dpadLikePreset(outBase) {
  return {
    presetId: "dpad_four_way",
    kind: "dpad_tile_set",
    frames: DPAD_LIKE_FRAMES,
    outBase,
    tileSize: 256,
    prompt: {
      frameStyle: DPAD_FRAME_STYLE,
      frameComposition: DPAD_FRAME_COMPOSITION,
      sheetStyle: DPAD_SHEET_STYLE,
      sheetComposition: DPAD_SHEET_COMPOSITION,
      sheetSubject: DPAD_SHEET_SUBJECT,
    },
    fal: {
      defaultEndpoint: "fal-ai/flux/dev",
      falExtrasPerTile: FAL_EXTRAS_TILE,
      falExtrasSheet: FAL_EXTRAS_TILE,
    },
    qa: { spriteWidth: 32, spriteHeight: 32 },
    provenance: { tool: "tools/sprite-generation/pipeline.test.mjs", version: 1 },
    spriteRef: {
      kind: "frameKeyRect",
      jsonRelativePath: "sprite-ref.json",
      artUrlPrefix: "art/pipeline-test",
      pngFilename: "dpad.png",
    },
  };
}

describe("pipeline (integration)", () => {
  /** @type {string | undefined} */
  let dir;

  afterEach(async () => {
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
      expect(png.width).toBe(256);
      expect(png.height).toBe(256);

      const qaPath = join(dir, id, "png-analyze.json");
      const qaRaw = JSON.parse(await readFile(qaPath, "utf8"));
      expect(qaRaw.dimensions?.width).toBe(256);
      expect(qaRaw.dimensions?.height).toBe(256);
    }

    const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
    expect(manifest.recipeId).toBe(`sprite-gen-dpad_four_way-mock-${RECIPE_VERSION_MOCK}`);
    expect(manifest.preset).toBe("dpad_four_way");
    expect(manifest.generationResults?.up?.chromaApplied).toBe(false);

    const refRaw = JSON.parse(await readFile(join(dir, "sprite-ref.json"), "utf8"));
    const parsed = parseFrameKeyRectManifestJson(refRaw);
    expect(parsed.frames["up"].width).toBe(256);
    expect(refRaw.images?.up).toBe("art/pipeline-test/up/dpad.png");
  });

  it("mock sheet + crop: four tiles from one mock sheet, manifest records sheet strategy metadata", async () => {
    dir = join(tmpdir(), `pipe-mock-sheet-${process.pid}-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const preset = {
      ...dpadLikePreset(dir),
      sheet: { size: 512, crops: SHEET_CROPS },
    };

    await runPipeline(preset, { mode: "mock", strategy: "sheet" });

    for (const id of ["up", "down", "left", "right"]) {
      const pngPath = join(dir, id, "dpad.png");
      const buf = await readFile(pngPath);
      const png = PNG.sync.read(buf);
      expect(png.width).toBe(256);
      expect(png.height).toBe(256);
    }

    const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
    expect(manifest.generationRecipe?.mode).toBe("mock");
    expect(manifest.generationResults?.up?.fromSheet).toBe(true);
    expect(manifest.generationResults?._sheet?.strategy).toBe("sheet");
  });
});
