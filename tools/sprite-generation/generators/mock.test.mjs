import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

import { DPAD_SHEET_LAYOUT } from "../presets/dpad.mjs";
import {
  defaultDpadShapeForFrame,
  generate,
  generateSheet,
  pointInTriangle,
} from "./mock.mjs";

function rgbaAt(png, x, y) {
  const i = (png.width * y + x) << 2;
  return {
    r: png.data[i],
    g: png.data[i + 1],
    b: png.data[i + 2],
    a: png.data[i + 3],
  };
}

describe("sprite-generation mock generator", () => {
  it("produces 256×256 RGBA PNG with transparent background and filled triangle (up)", async () => {
    const frame = { id: "up", outSubdir: "up", promptVariant: "" };
    const { buffer, metadata } = await generate(frame, { tileSize: 256, seed: 42 });
    expect(metadata.width).toBe(256);
    expect(metadata.height).toBe(256);
    expect(metadata.mode).toBe("mock");

    const png = PNG.sync.read(buffer);
    expect(png.width).toBe(256);
    expect(png.height).toBe(256);
    expect(png.colorType).toBe(6);

    // Corner: fully transparent
    expect(rgbaAt(png, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(rgbaAt(png, 255, 255)).toEqual({ r: 0, g: 0, b: 0, a: 0 });

    // Inside default D-pad "up" triangle (apex ~y=32, base ~y=224): center column mid-body
    const inside = rgbaAt(png, 128, 100);
    expect(inside.a).toBe(255);
    expect(inside.r).toBe(0x5a);
    expect(inside.g).toBe(0x6f);
    expect(inside.b).toBe(0x9e);

    // Just outside triangle near top-left margin (known empty spot)
    const outside = rgbaAt(png, 8, 8);
    expect(outside.a).toBe(0);
  });

  it("respects preset tileSize for dimensions and geometry", async () => {
    const tileSize = 128;
    const frame = { id: "right", outSubdir: "r", promptVariant: "" };
    const { buffer, metadata } = await generate(frame, { tileSize });
    expect(metadata.width).toBe(tileSize);
    expect(metadata.height).toBe(tileSize);
    const png = PNG.sync.read(buffer);
    expect(png.width).toBe(tileSize);
    expect(png.height).toBe(tileSize);
    // Transparent corner
    expect(rgbaAt(png, 0, 0).a).toBe(0);
    // Opaque pixel at default "right" triangle tip (tileSize - margin, vertical center)
    const tip = rgbaAt(png, tileSize - 32, tileSize / 2);
    expect(tip.a).toBe(255);
  });

  it("uses injectable shapeForFrame instead of default D-pad triangle", async () => {
    const frame = { id: "custom", outSubdir: "x", promptVariant: "" };
    const { buffer } = await generate(frame, {
      tileSize: 32,
      shapeForFrame: () => [
        { x: 4, y: 4 },
        { x: 28, y: 4 },
        { x: 16, y: 28 },
      ],
      fill: { r: 10, g: 20, b: 30, a: 255 },
    });
    const png = PNG.sync.read(buffer);
    expect(rgbaAt(png, 16, 14)).toEqual({ r: 10, g: 20, b: 30, a: 255 });
    expect(rgbaAt(png, 0, 0).a).toBe(0);
  });

  it("composes a 2×2 mock sheet from an explicit cell layout (512×512)", async () => {
    const layout2x2 = {
      up: { x: 0, y: 0 },
      right: { x: 1, y: 0 },
      left: { x: 0, y: 1 },
      down: { x: 1, y: 1 },
    };
    const frames = [
      { id: "up", outSubdir: "u", promptVariant: "" },
      { id: "right", outSubdir: "r", promptVariant: "" },
      { id: "left", outSubdir: "l", promptVariant: "" },
      { id: "down", outSubdir: "d", promptVariant: "" },
    ];
    const { buffer, metadata } = await generateSheet(frames, {
      tileSize: 256,
      sheetLayout: layout2x2,
    });
    expect(metadata.width).toBe(512);
    expect(metadata.height).toBe(512);
    const sheet = PNG.sync.read(buffer);
    const upAlone = PNG.sync.read((await generate(frames[0], { tileSize: 256 })).buffer);
    expect(rgbaAt(sheet, 0, 0)).toEqual(rgbaAt(upAlone, 0, 0));
    expect(rgbaAt(sheet, 128, 128).a).toBeGreaterThan(0);
  });

  it("composes 1×4 dpad strip at 100px tile (400×100 sheet)", async () => {
    const frames = [
      { id: "up", outSubdir: "u", promptVariant: "" },
      { id: "down", outSubdir: "d", promptVariant: "" },
      { id: "left", outSubdir: "l", promptVariant: "" },
      { id: "right", outSubdir: "r", promptVariant: "" },
    ];
    const { buffer, metadata } = await generateSheet(frames, {
      tileSize: 100,
      sheetLayout: DPAD_SHEET_LAYOUT,
    });
    expect(metadata.width).toBe(400);
    expect(metadata.height).toBe(100);
    const sheet = PNG.sync.read(buffer);
    expect(sheet.width).toBe(400);
    expect(sheet.height).toBe(100);
  });

  it("exports pointInTriangle consistent with raster", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };
    const c = { x: 5, y: 10 };
    expect(pointInTriangle({ x: 5, y: 3 }, a, b, c)).toBe(true);
    expect(pointInTriangle({ x: 0, y: 0 }, a, b, c)).toBe(true);
    expect(pointInTriangle({ x: 9, y: 9 }, a, b, c)).toBe(false);
  });

  it("defaultDpadShapeForFrame matches triangleForDirection for known ids", () => {
    const t = defaultDpadShapeForFrame({ id: "left" }, { tileSize: 256 });
    expect(t).toHaveLength(3);
    expect(t[0].x).toBeLessThan(128);
  });
});
