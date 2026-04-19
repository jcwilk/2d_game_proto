import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import { mapCliModeToPipelineMode, parseRunArgs } from "./generate-spritesheet.ts";
import { PRESETS } from "./sprite-generation/presets/registry.ts";

const NODE_TS_RUNNER_FLAGS = ["--experimental-strip-types"] as const;

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
/** First registry key (sorted slugs) — avoids pinning CLI smoke tests to one production asset. */
const FIRST_PRESET = (() => {
  const id = Object.keys(PRESETS)[0];
  if (id === undefined) throw new Error("PRESETS registry is empty");
  return id;
})();
const cliPath = join(repoRoot, "tools/generate-spritesheet.ts");

function runCli(args: string[]): string {
  return execFileSync(process.execPath, [...NODE_TS_RUNNER_FLAGS, cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runCliStatus(args: string[]): { code: number; stdout: string; stderr: string } {
  try {
    const out = runCli(args);
    return { code: 0, stdout: out, stderr: "" };
  } catch (e) {
    const err = e as NodeJS.ErrnoException & { stdout?: string; stderr?: string; status?: number };
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
    const file = readFileSync(join(repoRoot, "tools/generate-spritesheet.ts"), "utf8");
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
    const r = runCliStatus(["run", "--asset", FIRST_PRESET]);
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

  it("info --asset <first registry preset> exits 0 with expected sections", () => {
    const r = runCliStatus(["info", "--asset", FIRST_PRESET]);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(new RegExp(`^asset: ${FIRST_PRESET.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m"));
    expect(r.stdout).toContain("## Git-tracked files");
    expect(r.stdout).toContain("## manifest.json (summary)");
    expect(r.stdout).toContain("## Preset (loaded via createPreset)");
  });

  it("rename --dry-run --from <first preset> exits 0 with plan shape", () => {
    const toSlug = `hud_${FIRST_PRESET}`;
    const r = runCliStatus(["rename", "--dry-run", "--from", FIRST_PRESET, "--to", toSlug]);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(
      new RegExp(
        `^rename dry-run: ${FIRST_PRESET.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} -> ${toSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
        "m",
      ),
    );
    expect(r.stdout).toContain("registry.ts");
    expect(r.stdout).toContain("Candidate references");
    expect(r.stdout).toContain("--apply is not available");
  });

  it("rename --dry-run with blocklisted --to exits non-zero", () => {
    const r = runCliStatus(["rename", "--dry-run", "--from", FIRST_PRESET, "--to", "art"]);
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/blocklist/i);
  });

  it("rename without --dry-run exits non-zero", () => {
    const r = runCliStatus(["rename", "--from", FIRST_PRESET, "--to", `hud_${FIRST_PRESET}`]);
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/dry-run/i);
  });

  it("help rename exits 0", () => {
    expect(runCliStatus(["help", "rename"]).code).toBe(0);
  });

  let tmpDir: string | undefined;

  afterEach(async () => {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true });
      tmpDir = undefined;
    }
  });

  it("mock run with --out-base temp dir succeeds", async () => {
    tmpDir = join(tmpdir(), `gs-mock-${process.pid}-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    const r = runCliStatus(["run", "--asset", FIRST_PRESET, "--mode", "mock", "--out-base", tmpDir]);
    expect(r.code).toBe(0);
  });
});
