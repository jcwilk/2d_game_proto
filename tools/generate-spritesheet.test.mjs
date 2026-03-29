import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import {
  mapCliModeToPipelineMode,
  parseRunArgs,
} from "./generate-spritesheet.mjs";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const cliPath = join(repoRoot, "tools/generate-spritesheet.mjs");

function runCli(args) {
  return execFileSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runCliStatus(args) {
  try {
    const out = runCli(args);
    return { code: 0, stdout: out, stderr: "" };
  } catch (e) {
    const err = /** @type {NodeJS.ErrnoException & { stdout?: string; stderr?: string; status?: number }} */ (
      e
    );
    return {
      code: err.status ?? 1,
      stdout: err.stdout?.toString() ?? "",
      stderr: err.stderr?.toString() ?? "",
    };
  }
}

describe("generate-spritesheet CLI", () => {
  it("mapCliModeToPipelineMode maps live to generate and mock to mock", () => {
    expect(mapCliModeToPipelineMode("live")).toBe("generate");
    expect(mapCliModeToPipelineMode("mock")).toBe("mock");
  });

  it("live maps to generate exactly once in the mapping helper (pipeline mode string)", () => {
    const file = readFileSync(join(repoRoot, "tools/generate-spritesheet.mjs"), "utf8");
    const returnsGenerate = file.match(/return "generate"/g) ?? [];
    expect(returnsGenerate.length).toBe(1);
  });

  it("parseRunArgs accepts run flags", () => {
    const p = parseRunArgs(["--asset", "dpad", "--mode", "mock", "--out-base", "/tmp/x"]);
    expect(p.asset).toBe("dpad");
    expect(p.mode).toBe("mock");
    expect(p.outBase).toBe("/tmp/x");
  });

  it("run without --mode exits non-zero", () => {
    const r = runCliStatus(["run", "--asset", "dpad"]);
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/mode/i);
  });

  it("run without --asset exits non-zero", () => {
    const r = runCliStatus(["run", "--mode", "mock"]);
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/asset/i);
  });

  it("help and help run exit 0", () => {
    expect(runCliStatus(["help"]).code).toBe(0);
    expect(runCliStatus(["help", "run"]).code).toBe(0);
  });

  it("list and status exit 0 in repo", () => {
    expect(runCliStatus(["list"]).code).toBe(0);
    expect(runCliStatus(["status"]).code).toBe(0);
  });

  /** @type {string | undefined} */
  let tmpDir;

  afterEach(async () => {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true });
      tmpDir = undefined;
    }
  });

  it("mock run with --out-base temp dir succeeds", async () => {
    tmpDir = join(tmpdir(), `gs-mock-${process.pid}-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    const r = runCliStatus(["run", "--asset", "dpad", "--mode", "mock", "--out-base", tmpDir]);
    expect(r.code).toBe(0);
  });
});
