import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { PRESETS } from "./presets/registry.mjs";
import {
  buildRenameDryRunPlan,
  formatRenameDryRunPlan,
  isValidSlugShape,
  RENAME_TO_BLOCKLIST,
  validateRenameSlugs,
} from "./rename-dry-run.mjs";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

describe("rename-dry-run", () => {
  it("blocklist includes generic reserved tokens (non-blocklisted slugs are collision-only)", () => {
    for (const w of ["character", "sprite", "asset", "art"]) {
      expect(RENAME_TO_BLOCKLIST.has(w)).toBe(true);
    }
    expect(RENAME_TO_BLOCKLIST.has("alpha")).toBe(false);
  });

  it("validateRenameSlugs rejects --to colliding with an existing asset slug", () => {
    const r = validateRenameSlugs("alpha", "beta", ["alpha", "beta"]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/collide/i);
  });

  it("validateRenameSlugs rejects blocklisted --to", () => {
    const r = validateRenameSlugs("alpha", "art", ["alpha", "beta"]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/blocklist/i);
  });

  it("validateRenameSlugs rejects --to colliding with existing asset", () => {
    const r = validateRenameSlugs("alpha", "slug_a", ["alpha", "beta", "slug_a"]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/collide/i);
  });

  it("validateRenameSlugs rejects unknown --from", () => {
    const r = validateRenameSlugs("nope", "foo_bar", ["alpha", "beta"]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/unknown/i);
  });

  it("hyphenated slug shape is accepted by SLUG_RE (via isValidSlugShape)", () => {
    expect(isValidSlugShape("hud-alpha")).toBe(true);
  });

  it("buildRenameDryRunPlan succeeds for first registry preset -> hud_<slug> with expected shape", () => {
    const registryIds = Object.keys(PRESETS);
    const from = registryIds[0];
    const to = `hud_${from.replace(/-/g, "_")}`;
    const plan = buildRenameDryRunPlan(repoRoot, from, to, registryIds);
    expect(plan.ok).toBe(true);
    if (!plan.ok) throw new Error("expected ok");
    expect(plan.from).toBe(from);
    expect(plan.to).toBe(to);
    expect(plan.directories).toHaveLength(2);
    expect(plan.presetModule.from.replace(/\\/g, "/")).toContain(
      `tools/sprite-generation/presets/${from}/${from}.mjs`,
    );
    expect(plan.candidateFiles.length).toBeGreaterThan(0);
    const text = formatRenameDryRunPlan(plan);
    expect(text.startsWith(`rename dry-run: ${from} -> ${to}`)).toBe(true);
    expect(text).toContain("registry.mjs");
    expect(text).toContain("Candidate references");
  });
});
