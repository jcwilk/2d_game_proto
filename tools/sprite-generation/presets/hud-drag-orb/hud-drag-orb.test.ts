import { describe, expect, it } from "vitest";

import type { SpriteRefGridFrameKeys } from "../../sprite-ref.ts";
import { NANO_BANANA2_DEFAULT_ASPECT_RATIO } from "../../generators/fal.ts";
import {
  ASSET_ID,
  DEFAULT_FAL_ENDPOINT,
  HUD_DRAG_ORB_FRAMES,
  KIND,
  MANIFEST_PRESET_ID,
  TILE_SIZE,
  createPreset,
} from "./hud-drag-orb.ts";

describe("presets/hud-drag-orb", () => {
  it("createPreset builds 1×4 gridFrameKeys strip with stable frame ids for sprite-ref", () => {
    const p = createPreset({ outBase: "/tmp/hud-drag-orb-out" });
    expect(p.presetId).toBe(MANIFEST_PRESET_ID);
    expect(p.kind).toBe(KIND);
    expect(p.frames).toStrictEqual(HUD_DRAG_ORB_FRAMES);
    expect(p.sheet?.rows).toBe(1);
    expect(p.sheet?.columns).toBe(4);
    expect(p.sheet?.width).toBe(TILE_SIZE * 4);
    expect(p.sheet?.height).toBe(TILE_SIZE);
    expect(p.frameSheetCells).toMatchObject({
      idle: { column: 0, row: 0 },
      activate_1: { column: 1, row: 0 },
      activate_2: { column: 2, row: 0 },
      activate_3: { column: 3, row: 0 },
    });
    expect(p.spriteRef.kind).toBe("gridFrameKeys");
    const spriteRef = p.spriteRef as SpriteRefGridFrameKeys;
    expect(spriteRef.sheetImageRelativePath).toBe("art/hud-drag-orb/sheet.png");
    expect(p.fal?.defaultEndpoint).toBe(DEFAULT_FAL_ENDPOINT);
    expect(p.fal?.falExtrasSheet).toMatchObject({
      aspect_ratio: NANO_BANANA2_DEFAULT_ASPECT_RATIO,
      resolution: "0.5K",
      expand_prompt: true,
      safety_tolerance: 2,
    });
    expect(p.fal?.sheetRewrite?.enabled).toBe(true);
    const buf = p.generatorConfig!.tileBufferForFrame!(
      { id: "idle", outSubdir: "idle", promptVariant: "" },
      { tileSize: TILE_SIZE, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE },
    );
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(100);
  });

  it("ASSET_ID matches registry directory name", () => {
    expect(ASSET_ID).toBe("hud-drag-orb");
  });

  it("rejects missing outBase", () => {
    expect(() => createPreset({} as import("./hud-drag-orb.ts").CreateHudDragOrbPresetOpts)).toThrow(/outBase/);
  });
});
