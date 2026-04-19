import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PNG } from "pngjs";

import { getPngAnalyzeScriptPathForTests, runPngAnalyzeBridge } from "./analyze-bridge.mjs";

/**
 * Repo root for `tools/png-analyze.ts` must match `analyze-bridge.mjs`:
 * from `tools/sprite-generation/qa/`, three parents up to the repository root.
 */
describe("analyze-bridge (integration)", () => {
  /** @type {string | undefined} */
  let dir;

  afterEach(() => {
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
      dir = undefined;
    }
  });

  it("writes sidecar JSON identical to a direct monolith-style png-analyze run", () => {
    dir = mkdtempSync(join(tmpdir(), "qa-bridge-int-"));
    const pngPath = join(dir, "tile.png");
    const jsonPath = join(dir, "png-analyze.json");

    const png = new PNG({ width: 16, height: 16, colorType: 6 });
    png.data.fill(0);
    for (let i = 3; i < png.data.length; i += 8) {
      png.data[i] = 255;
    }
    writeFileSync(pngPath, PNG.sync.write(png));

    const spriteW = 8;
    const spriteH = 8;

    runPngAnalyzeBridge(pngPath, jsonPath, spriteW, spriteH);

    const script = getPngAnalyzeScriptPathForTests();
    const direct = execFileSync(process.execPath, ["--experimental-strip-types", script, pngPath, "--sprite-width", String(spriteW), "--sprite-height", String(spriteH)], {
      encoding: "utf8",
    });
    const sidecar = readFileSync(jsonPath, "utf8");

    expect(JSON.parse(sidecar)).toEqual(JSON.parse(direct));
  });
});
