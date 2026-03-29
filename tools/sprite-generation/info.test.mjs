import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  gitTrackedFilesUnderArtDir,
  parseInfoArgs,
  readPngIhdrDimensions,
  summarizeManifest,
  summarizeSpriteRef,
} from "./info.mjs";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

describe("info helpers", () => {
  it("parseInfoArgs parses --asset, --out-base, --no-prompts", () => {
    expect(parseInfoArgs(["--asset", "dpad"])).toEqual({ asset: "dpad", prompts: true });
    expect(parseInfoArgs(["--asset", "dpad", "--no-prompts"])).toEqual({ asset: "dpad", prompts: false });
    expect(parseInfoArgs(["--asset", "x", "--out-base", "/tmp/o"])).toEqual({
      asset: "x",
      outBase: "/tmp/o",
      prompts: true,
    });
  });

  it("parseInfoArgs throws on unknown flag", () => {
    expect(() => parseInfoArgs(["--nope"])).toThrow(/Unknown argument/);
  });

  it("readPngIhdrDimensions reads dpad sheet", () => {
    const p = join(repoRoot, "public/art/dpad/sheet.png");
    const d = readPngIhdrDimensions(p);
    expect(d).not.toBeNull();
    expect(d?.width).toBeGreaterThan(0);
    expect(d?.height).toBeGreaterThan(0);
  });

  it("gitTrackedFilesUnderArtDir returns sorted paths under public/art/dpad/", () => {
    const r = gitTrackedFilesUnderArtDir(repoRoot, "public/art/dpad");
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.files.length).toBeGreaterThan(0);
    expect(r.files.some((f) => f.endsWith("manifest.json"))).toBe(true);
    expect(r.files).toEqual([...r.files].sort());
  });

  it("summarizeManifest extracts dpad manifest fields", () => {
    const raw = readFileSync(join(repoRoot, "public/art/dpad/manifest.json"), "utf8");
    const j = JSON.parse(raw);
    const lines = summarizeManifest(j);
    expect(lines.some((l) => l.startsWith("kind:"))).toBe(true);
    expect(lines.some((l) => l.includes("frames (4):"))).toBe(true);
    expect(lines.some((l) => l.includes("sheetSize:"))).toBe(true);
  });

  it("summarizeSpriteRef extracts gridFrameKeys-style ref", () => {
    const raw = readFileSync(join(repoRoot, "public/art/dpad/sprite-ref.json"), "utf8");
    const j = JSON.parse(raw);
    const lines = summarizeSpriteRef(j);
    expect(lines.some((l) => l.includes("gridFrameKeys"))).toBe(true);
    expect(lines.some((l) => l.includes("image:"))).toBe(true);
    expect(lines.some((l) => l.startsWith("grid:"))).toBe(true);
  });
});
