// @ts-nocheck
/**
 * Dry-run planner for renaming a registry asset slug (preset + public art paths).
 * No filesystem writes; used by `generate-spritesheet rename --dry-run`.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/** Reserved or ambiguous slugs — invalid for `--to` (ticket blocklist + path/conflict safety). */
export const RENAME_TO_BLOCKLIST = new Set([
  "art",
  "asset",
  "assets",
  "character",
  "sprite",
  "sprites",
  "public",
  "tools",
  "registry",
  "manifest",
  "sheet",
  "preset",
  "presets",
  "sprite-generation",
  "generate",
  "mock",
  "live",
  "run",
  "list",
  "status",
  "help",
  "rename",
  "node_modules",
  "src",
  "static",
]);

const SLUG_RE = /^[a-z][a-z0-9_-]*[a-z0-9]$/;

/**
 * @param {string} s
 * @returns {boolean}
 */
export function isValidSlugShape(s) {
  return SLUG_RE.test(s);
}

/**
 * @param {string[]} argvSlice argv after `rename`
 * @returns {{ dryRun: boolean; from?: string; to?: string }}
 */
export function parseRenameArgs(argvSlice) {
  /** @type {{ dryRun: boolean; from?: string; to?: string }} */
  const opts = { dryRun: false };
  for (let i = 0; i < argvSlice.length; i++) {
    const a = argvSlice[i];
    const next = () => {
      const v = argvSlice[++i];
      if (v === undefined) throw new Error(`Missing value after ${a}`);
      return v;
    };
    switch (a) {
      case "--dry-run":
        opts.dryRun = true;
        break;
      case "--from":
        opts.from = next();
        break;
      case "--to":
        opts.to = next();
        break;
      default:
        throw new Error(`Unknown argument: ${a} (use: generate-spritesheet help rename)`);
    }
  }
  return opts;
}

/**
 * @param {string} from
 * @param {string} to
 * @param {readonly string[]} registryAssetIds
 * @returns {{ ok: true } | { ok: false; reason: string }}
 */
export function validateRenameSlugs(from, to, registryAssetIds) {
  if (!from || !to) {
    return { ok: false, reason: "--from and --to are required" };
  }
  if (from === to) {
    return { ok: false, reason: "--from and --to must differ" };
  }
  if (!isValidSlugShape(from)) {
    return {
      ok: false,
      reason: `--from must match /^[a-z][a-z0-9_-]*[a-z0-9]$/ (got ${JSON.stringify(from)})`,
    };
  }
  if (!isValidSlugShape(to)) {
    return {
      ok: false,
      reason: `--to must match /^[a-z][a-z0-9_-]*[a-z0-9]$/ (got ${JSON.stringify(to)})`,
    };
  }
  if (!registryAssetIds.includes(from)) {
    return {
      ok: false,
      reason: `unknown --from asset ${JSON.stringify(from)} (not in registry; see: list)`,
    };
  }
  if (RENAME_TO_BLOCKLIST.has(to)) {
    return {
      ok: false,
      reason: `--to ${JSON.stringify(to)} is blocklisted (reserved or ambiguous; pick a non-generic slug)`,
    };
  }
  if (registryAssetIds.includes(to)) {
    return {
      ok: false,
      reason: `--to ${JSON.stringify(to)} collides with an existing registry asset`,
    };
  }
  return { ok: true };
}

/**
 * @param {string} content
 * @param {string} slug
 * @returns {string[]} human-readable match hints
 */
export function matchHintsForSlug(content, slug) {
  /** @type {string[]} */
  const hints = [];
  if (content.includes(`public/art/${slug}`)) hints.push(`public/art/${slug}`);
  if (content.includes(`presets/${slug}`)) hints.push(`presets/${slug}`);
  if (content.includes(`presets\\${slug}`)) hints.push(`presets\\${slug}`);
  if (content.includes(`/${slug}/${slug}.mjs`)) hints.push(`${slug}/${slug}.mjs`);
  if (content.includes(`"${slug}"`)) hints.push(`"${slug}"`);
  if (content.includes(`'${slug}'`)) hints.push(`'${slug}'`);
  return hints;
}

const TEXT_GLOB_SUFFIX = /\.(mjs|ts|tsx|json|md|css|html|txt)$/i;

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  ".cache",
  "playwright-report",
  "test-results",
]);

/**
 * @param {string} repoRoot
 * @param {string} slug
 * @param {number} [maxFiles]
 * @returns {{ relPath: string; hints: string[] }[]}
 */
export function collectCandidateReferenceFiles(repoRoot, slug, maxFiles = 120) {
  /** @type {{ relPath: string; hints: string[] }[]} */
  const out = [];

  /**
   * @param {string} dir
   */
  function walk(dir) {
    if (out.length >= maxFiles) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (out.length >= maxFiles) return;
      const p = join(dir, ent.name);
      if (ent.isDirectory()) {
        if (SKIP_DIR_NAMES.has(ent.name)) continue;
        walk(p);
        continue;
      }
      if (!ent.isFile()) continue;
      if (!TEXT_GLOB_SUFFIX.test(ent.name)) continue;
      let st;
      try {
        st = statSync(p);
      } catch {
        continue;
      }
      if (st.size > 512 * 1024) continue;
      let content;
      try {
        content = readFileSync(p, "utf8");
      } catch {
        continue;
      }
      const hints = matchHintsForSlug(content, slug);
      if (hints.length === 0) continue;
      const rel = relative(repoRoot, p).split("\\").join("/");
      out.push({ relPath: rel, hints: [...new Set(hints)] });
    }
  }

  walk(repoRoot);
  out.sort((a, b) => a.relPath.localeCompare(b.relPath));
  return out;
}

/**
 * @param {string} repoRoot
 * @param {string} from
 * @param {string} to
 * @param {readonly string[]} registryAssetIds
 */
export function buildRenameDryRunPlan(repoRoot, from, to, registryAssetIds) {
  const v = validateRenameSlugs(from, to, registryAssetIds);
  if (!v.ok) {
    return { ok: false, error: v.reason };
  }

  const presetDirFrom = join(repoRoot, "tools", "sprite-generation", "presets", from);
  const presetDirTo = join(repoRoot, "tools", "sprite-generation", "presets", to);
  const artDirFrom = join(repoRoot, "public", "art", from);
  const artDirTo = join(repoRoot, "public", "art", to);
  const moduleFrom = join(presetDirFrom, `${from}.ts`);
  const moduleTo = join(presetDirTo, `${to}.ts`);

  const candidates = collectCandidateReferenceFiles(repoRoot, from);

  return {
    ok: true,
    from,
    to,
    directories: [
      { kind: "rename", from: presetDirFrom, to: presetDirTo },
      { kind: "rename", from: artDirFrom, to: artDirTo },
    ],
    presetModule: { from: moduleFrom, to: moduleTo },
    registryRel: "tools/sprite-generation/presets/registry.ts",
    registryNotes: [
      "Extend AssetId union / PRESETS with the new key; remove or repoint the old key.",
      "Update buildPresets() entry(): publicArtDir, preset path, manifestPresetId as needed.",
    ],
    candidateFiles: candidates,
  };
}

/**
 * @param {object} plan success branch from buildRenameDryRunPlan
 */
export function formatRenameDryRunPlan(plan) {
  const lines = [];
  lines.push(`rename dry-run: ${plan.from} -> ${plan.to}`);
  lines.push("(no writes; --apply is not available in MVP)");
  lines.push("");
  lines.push("Directories (git mv or equivalent):");
  for (const d of plan.directories) {
    lines.push(`  ${d.from}`);
    lines.push(`    -> ${d.to}`);
  }
  lines.push("");
  lines.push("Preset module file:");
  lines.push(`  ${plan.presetModule.from}`);
  lines.push(`    -> ${plan.presetModule.to}`);
  lines.push("");
  lines.push(`Registry (${plan.registryRel}):`);
  for (const n of plan.registryNotes) {
    lines.push(`  - ${n}`);
  }
  lines.push("");
  lines.push("Candidate references (manual search/replace; not exhaustive):");
  if (plan.candidateFiles.length === 0) {
    lines.push("  (none found under text extensions)");
  } else {
    for (const c of plan.candidateFiles) {
      lines.push(`  ${c.relPath}`);
      lines.push(`    hints: ${c.hints.join(", ")}`);
    }
  }
  return lines.join("\n");
}
