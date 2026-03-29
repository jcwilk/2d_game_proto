import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  buildRenameDryRunPlan,
  formatRenameDryRunPlan,
  RENAME_TO_BLOCKLIST,
  validateRenameSlugs,
} from "./rename-dry-run.mjs";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

describe("rename-dry-run", () => {
  it("blocklist includes ticket examples", () => {
    for (const w of ["character", "dpad", "sprite", "asset", "art"]) {
      expect(RENAME_TO_BLOCKLIST.has(w)).toBe(true);
    }
  });

  it("validateRenameSlugs rejects blocklisted --to", () => {
    const r = validateRenameSlugs("dpad", "art", ["dpad", "character"]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/blocklist/i);
  });

  it("validateRenameSlugs rejects --to colliding with existing asset", () => {
    const r = validateRenameSlugs("dpad", "widget", ["dpad", "character", "widget"]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/collide/i);
  });

  it("validateRenameSlugs rejects unknown --from", () => {
    const r = validateRenameSlugs("nope", "foo_bar", ["dpad", "character"]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/unknown/i);
  });

  it("buildRenameDryRunPlan succeeds for dpad -> hud_dpad with expected shape", () => {
    const plan = buildRenameDryRunPlan(repoRoot, "dpad", "hud_dpad", ["dpad", "character"]);
    expect(plan.ok).toBe(true);
    if (!plan.ok) throw new Error("expected ok");
    expect(plan.from).toBe("dpad");
    expect(plan.to).toBe("hud_dpad");
    expect(plan.directories).toHaveLength(2);
    expect(plan.presetModule.from.replace(/\\/g, "/")).toContain(
      "tools/sprite-generation/presets/dpad/dpad.mjs",
    );
    expect(plan.candidateFiles.length).toBeGreaterThan(0);
    const text = formatRenameDryRunPlan(plan);
    expect(text).toMatch(/^rename dry-run: dpad -> hud_dpad/m);
    expect(text).toContain("registry.mjs");
    expect(text).toContain("Candidate references");
  });
});
