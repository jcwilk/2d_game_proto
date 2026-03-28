import { writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => ({
  execFileSync: vi.fn(() => '{"dimensions":{"width":1,"height":1}}\n'),
}));

import { execFileSync } from "node:child_process";

import { getPngAnalyzeScriptPathForTests, runPngAnalyzeBridge } from "./analyze-bridge.mjs";

describe("analyze-bridge spawn argv", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("invokes node with tools/png-analyze.mjs and preset sprite dimensions (golden argv)", () => {
    const dir = mkdtempSync(join(tmpdir(), "qa-bridge-spawn-"));
    const png = join(dir, "t.png");
    const jsonOut = join(dir, "png-analyze.json");
    writeFileSync(png, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

    runPngAnalyzeBridge(png, jsonOut, 32, 48);

    expect(execFileSync).toHaveBeenCalledOnce();
    expect(execFileSync).toHaveBeenCalledWith(process.execPath, [getPngAnalyzeScriptPathForTests(), png, "--sprite-width", "32", "--sprite-height", "48"], {
      encoding: "utf8",
    });
  });
});
