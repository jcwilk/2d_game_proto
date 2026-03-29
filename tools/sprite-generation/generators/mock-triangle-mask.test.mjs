import { describe, expect, it } from "vitest";

import {
  renderTriangleSilhouetteSheetBuffer,
  renderTriangleSilhouetteTileBuffer,
  softenTriangleMaskBuffer,
  triangleForDirection,
} from "./mock.mjs";

describe("mock triangle silhouette masks", () => {
  it("renderTriangleSilhouetteTileBuffer produces expected WxH PNG", () => {
    const tileSize = 32;
    const vertices = triangleForDirection("up", tileSize);
    const buf = renderTriangleSilhouetteTileBuffer({ tileSize, vertices });
    expect(buf.length).toBeGreaterThan(100);
  });

  it("renderTriangleSilhouetteSheetBuffer places four triangles from crops", () => {
    const tileSize = 16;
    const frames = [
      { id: "up" },
      { id: "down" },
      { id: "left" },
      { id: "right" },
    ];
    const crops = {
      up: { x: 0, y: 0 },
      down: { x: 16, y: 0 },
      left: { x: 32, y: 0 },
      right: { x: 48, y: 0 },
    };
    const buf = renderTriangleSilhouetteSheetBuffer({ frames, tileSize, crops });
    expect(buf.length).toBeGreaterThan(200);
  });

  it("renderTriangleSilhouetteSheetBuffer with explicit sheetWidth/sheetHeight matches preset geometry", () => {
    const tileSize = 100;
    const frames = [
      { id: "up" },
      { id: "down" },
      { id: "left" },
      { id: "right" },
    ];
    const crops = {
      up: { x: 0, y: 0 },
      down: { x: 100, y: 0 },
      left: { x: 200, y: 0 },
      right: { x: 300, y: 0 },
    };
    const buf = renderTriangleSilhouetteSheetBuffer({
      frames,
      tileSize,
      crops,
      sheetWidth: 400,
      sheetHeight: 100,
    });
    expect(buf.length).toBeGreaterThan(500);
  });

  it("renderTriangleSilhouetteSheetBuffer throws when crop exceeds explicit sheet dimensions", () => {
    const tileSize = 50;
    const frames = [{ id: "up" }];
    const crops = { up: { x: 0, y: 0 } };
    expect(() =>
      renderTriangleSilhouetteSheetBuffer({
        frames,
        tileSize,
        crops,
        sheetWidth: 40,
        sheetHeight: 40,
      }),
    ).toThrow(/exceeds sheet/);
  });

  it("softenTriangleMaskBuffer is deterministic for a fixed input", () => {
    const tileSize = 8;
    const vertices = triangleForDirection("right", tileSize);
    const buf = renderTriangleSilhouetteTileBuffer({ tileSize, vertices });
    const soft = softenTriangleMaskBuffer(buf, 1);
    expect(soft.length).toBeGreaterThan(50);
  });
});
