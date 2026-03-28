import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";

import { renderControlMaskBuffer, renderControlSheetMaskBuffer, softenControlMaskBuffer } from "./control-image.mjs";
import { triangleForDirection } from "./generators/mock.mjs";

describe("control-image", () => {
  it("renders white-on-black triangle matching mock geometry", () => {
    const tileSize = 256;
    const vertices = triangleForDirection("left", tileSize);
    const buf = renderControlMaskBuffer({ tileSize, vertices });
    const png = PNG.sync.read(buf);
    expect(png.width).toBe(256);
    expect(png.height).toBe(256);
    const i = (png.width * 128 + 32) << 2;
    expect(png.data[i]).toBe(255);
    expect(png.data[i + 3]).toBe(255);
    const j = (png.width * 0 + 0) << 2;
    expect(png.data[j]).toBe(0);
  });

  it("composes 1×4 dpad control mask at 100px tile", () => {
    const tileSize = 100;
    const crops = {
      up: { x: 0, y: 0 },
      down: { x: 100, y: 0 },
      left: { x: 200, y: 0 },
      right: { x: 300, y: 0 },
    };
    const frames = [
      { id: "up", outSubdir: "u", promptVariant: "" },
      { id: "down", outSubdir: "d", promptVariant: "" },
      { id: "left", outSubdir: "l", promptVariant: "" },
      { id: "right", outSubdir: "r", promptVariant: "" },
    ];
    const buf = renderControlSheetMaskBuffer({ frames, tileSize, crops });
    const png = PNG.sync.read(buf);
    expect(png.width).toBe(400);
    expect(png.height).toBe(100);
  });

  it("renderControlSheetMaskBuffer with explicit sheetWidth/sheetHeight matches preset geometry (2gp-6iay)", () => {
    const tileSize = 100;
    const crops = {
      up: { x: 0, y: 0 },
      down: { x: 100, y: 0 },
      left: { x: 200, y: 0 },
      right: { x: 300, y: 0 },
    };
    const frames = [
      { id: "up", outSubdir: "u", promptVariant: "" },
      { id: "down", outSubdir: "d", promptVariant: "" },
      { id: "left", outSubdir: "l", promptVariant: "" },
      { id: "right", outSubdir: "r", promptVariant: "" },
    ];
    const buf = renderControlSheetMaskBuffer({
      frames,
      tileSize,
      crops,
      sheetWidth: 400,
      sheetHeight: 100,
    });
    const png = PNG.sync.read(buf);
    expect(png.width).toBe(400);
    expect(png.height).toBe(100);
  });

  it("renderControlSheetMaskBuffer throws when crop exceeds explicit sheet dimensions", () => {
    const tileSize = 100;
    const crops = { up: { x: 350, y: 0 } };
    const frames = [{ id: "up", outSubdir: "u", promptVariant: "" }];
    expect(() =>
      renderControlSheetMaskBuffer({
        frames,
        tileSize,
        crops,
        sheetWidth: 400,
        sheetHeight: 100,
      }),
    ).toThrow("exceeds sheet 400x100");
  });

  it("softenControlMaskBuffer introduces grayscale fringe (non-binary) pixels", () => {
    const tileSize = 32;
    const vertices = triangleForDirection("up", tileSize);
    const buf = renderControlMaskBuffer({ tileSize, vertices });
    const soft = softenControlMaskBuffer(buf, 1);
    const b = PNG.sync.read(soft);
    let hasGray = false;
    for (let i = 0; i < b.data.length; i += 4) {
      const v = b.data[i];
      if (v > 0 && v < 255) {
        hasGray = true;
        break;
      }
    }
    expect(hasGray).toBe(true);
  });
});
