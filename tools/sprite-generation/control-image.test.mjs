import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";

import { renderControlMaskBuffer } from "./control-image.mjs";
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
});
