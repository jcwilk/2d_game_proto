import { readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { PRESETS, resolveRepoRoot } from "./registry.mjs";

describe("presets/registry.mjs", () => {
  it("resolveRepoRoot finds repo containing this package.json", () => {
    const root = resolveRepoRoot(import.meta.url);
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    expect(pkg.name).toBe("2d-game-proto");
  });

  it("PRESETS entries use absolute file: URLs under resolved repo root", () => {
    const repoRoot = resolveRepoRoot();
    for (const id of /** @type {const} */ (["dpad", "avatar-character"])) {
      const href = PRESETS[id].presetModuleHref;
      expect(href.startsWith("file:")).toBe(true);
      const fsPath = fileURLToPath(href);
      const rel = relative(repoRoot, resolve(fsPath));
      expect(rel.startsWith("..")).toBe(false);
      expect(rel).toMatch(/^tools[/\\]sprite-generation[/\\]presets[/\\]/);
    }
  });

  it("dynamic import succeeds for each preset module (CI)", async () => {
    for (const id of /** @type {const} */ (["dpad", "avatar-character"])) {
      const mod = await import(PRESETS[id].presetModuleHref);
      expect(mod.ASSET_ID).toBe(id);
      expect(mod.createPreset).toBeTypeOf("function");
    }
  });
});
