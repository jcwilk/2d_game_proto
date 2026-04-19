// @ts-nocheck
/**
 * `generate-spritesheet info` — summarize a registry asset (git-tracked art files,
 * on-disk metadata, loaded preset + prompt excerpts).
 */

import { closeSync, existsSync, openSync, readSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** @param {string} s @param {number} max */
function truncateEllipsis(s, max) {
  const t = String(s).replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

/**
 * Read PNG width/height from IHDR (first chunk) without extra deps.
 *
 * @param {string} absPath
 * @returns {{ width: number; height: number } | null}
 */
export function readPngIhdrDimensions(absPath) {
  if (!existsSync(absPath)) return null;
  let fd;
  try {
    fd = openSync(absPath, "r");
    const buf = Buffer.alloc(24);
    readSync(fd, buf, 0, 24, 0);
    if (buf[0] !== 0x89 || buf.subarray(1, 4).toString("ascii") !== "PNG") return null;
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    if (!width || !height) return null;
    return { width, height };
  } catch {
    return null;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

/**
 * @param {string[]} argvSlice argv after `info`
 * @returns {{ asset?: string; outBase?: string; prompts: boolean }}
 */
export function parseInfoArgs(argvSlice) {
  /** @type {{ asset?: string; outBase?: string; prompts: boolean }} */
  const opts = { prompts: true };
  for (let i = 0; i < argvSlice.length; i++) {
    const a = argvSlice[i];
    const next = () => {
      const v = argvSlice[++i];
      if (v === undefined) throw new Error(`Missing value after ${a}`);
      return v;
    };
    switch (a) {
      case "--asset":
        opts.asset = next();
        break;
      case "--out-base":
        opts.outBase = next();
        break;
      case "--no-prompts":
        opts.prompts = false;
        break;
      default:
        throw new Error(`Unknown argument: ${a} (use: generate-spritesheet help info)`);
    }
  }
  return opts;
}

/**
 * @param {string} repoRoot
 * @param {string} artDirRel POSIX e.g. `public/art/<slug>`
 * @returns {{ ok: true; files: string[] } | { ok: false; error: string }}
 */
export function gitTrackedFilesUnderArtDir(repoRoot, artDirRel) {
  const prefix = artDirRel.replace(/\/+$/, "") + "/";
  try {
    const out = execFileSync("git", ["ls-files", "--", prefix], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const files = out
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .sort();
    return { ok: true, files };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

/**
 * @param {unknown} j
 * @returns {Record<string, unknown> | null}
 */
function asObject(j) {
  return j !== null && typeof j === "object" && !Array.isArray(j) ? /** @type {Record<string, unknown>} */ (j) : null;
}

/**
 * @param {Record<string, unknown>} manifest
 * @returns {string[]}
 */
export function summarizeManifest(manifest) {
  /** @type {string[]} */
  const lines = [];
  const kind = manifest.kind;
  const preset = manifest.preset;
  const recipeId = manifest.recipeId;
  if (kind !== undefined) lines.push(`kind: ${String(kind)}`);
  if (preset !== undefined) lines.push(`preset: ${String(preset)}`);
  if (recipeId !== undefined) lines.push(`recipeId: ${String(recipeId)}`);

  const specs = asObject(manifest.specs);
  if (specs) {
    const fp = specs.framePreset;
    if (Array.isArray(fp)) {
      const ids = fp.map((x) => {
        const o = asObject(x);
        return o?.id != null ? String(o.id) : "?";
      });
      lines.push(`frames (${fp.length}): ${ids.join(", ")}`);
    }
    const sheetSize = asObject(specs.sheetSize);
    if (sheetSize && sheetSize.width != null && sheetSize.height != null) {
      lines.push(`sheetSize: ${sheetSize.width}×${sheetSize.height}px`);
    }
    const tileSize = asObject(specs.tileSize);
    if (tileSize && tileSize.width != null && tileSize.height != null) {
      lines.push(`tileSize: ${tileSize.width}×${tileSize.height}px`);
    }
    if (specs.strategy !== undefined) lines.push(`strategy: ${String(specs.strategy)}`);
    if (specs.naming !== undefined) lines.push(`naming: ${truncateEllipsis(String(specs.naming), 120)}`);
  }

  const gen = asObject(manifest.generationRecipe);
  if (gen) {
    if (gen.mode !== undefined) lines.push(`generationRecipe.mode: ${String(gen.mode)}`);
    if (gen.endpoint !== undefined) lines.push(`generationRecipe.endpoint: ${String(gen.endpoint)}`);
  }

  return lines;
}

/**
 * @param {Record<string, unknown>} sr
 * @returns {string[]}
 */
export function summarizeSpriteRef(sr) {
  /** @type {string[]} */
  const lines = [];
  if (typeof sr.image === "string") {
    lines.push(`kind: gridFrameKeys (single image)`);
    lines.push(`image: ${sr.image}`);
  } else if (sr.frames && typeof sr.frames === "object" && !Array.isArray(sr.frames)) {
    lines.push(`kind: frameKeyRect or hybrid (per-frame paths in frames)`);
    const keys = Object.keys(/** @type {Record<string, unknown>} */ (sr.frames));
    lines.push(`frame keys: ${keys.length} (${keys.slice(0, 8).join(", ")}${keys.length > 8 ? ", …" : ""})`);
  }

  const grid = asObject(sr.grid);
  if (grid) {
    const r = grid.rows;
    const c = grid.columns;
    const sw = grid.spriteWidth;
    const sh = grid.spriteHeight;
    if (r != null && c != null) {
      let g = `grid: ${r}×${c} cells`;
      if (sw != null && sh != null) g += `, cell ${sw}×${sh}px`;
      lines.push(g);
    }
  }

  const frames = sr.frames;
  if (frames && typeof frames === "object" && !Array.isArray(frames) && typeof sr.image === "string") {
    const fk = Object.keys(/** @type {Record<string, unknown>} */ (frames));
    lines.push(`sprite-ref frame keys: ${fk.length} (${fk.join(", ")})`);
  }

  return lines;
}

/**
 * @param {import('./pipeline.ts').PipelinePreset} preset
 * @param {boolean} includePrompts
 * @returns {string[]}
 */
export function summarizePresetPrompts(preset, includePrompts) {
  /** @type {string[]} */
  const lines = [];
  const pr = preset.prompt;
  if (!pr) return lines;

  lines.push(`sheetGridSize (preset): ${preset.sheetGridSize ?? "—"}`);
  lines.push(`sheetNativeRaster: ${preset.sheetNativeRaster ? "yes" : "no"}`);
  lines.push(`sheetOnlyOutput: ${preset.sheetOnlyOutput ? "yes" : "no"}`);

  if (preset.sheet) {
    const sh = preset.sheet;
    const w = sh.width ?? sh.size;
    const h = sh.height ?? sh.size;
    if (w != null && h != null) lines.push(`preset.sheet: ${w}×${h}px (${sh.rows ?? "?"}×${sh.columns ?? "?"} logical grid)`);
  }

  lines.push(`frame ids: ${preset.frames.map((f) => f.id).join(", ")}`);

  if (!includePrompts) {
    lines.push("(prompt excerpts omitted; use default or drop --no-prompts)");
    return lines;
  }

  if (typeof pr.sheetSubject === "string" && pr.sheetSubject.trim()) {
    lines.push(`sheetSubject: ${truncateEllipsis(pr.sheetSubject, 360)}`);
  }
  if (typeof pr.sheetRewriteUserPrompt === "string" && pr.sheetRewriteUserPrompt.trim()) {
    lines.push(`sheetRewriteUserPrompt: ${truncateEllipsis(pr.sheetRewriteUserPrompt, 280)}`);
  }
  if (typeof pr.frameStyle === "string" && pr.frameStyle.trim()) {
    lines.push(`frameStyle: ${truncateEllipsis(pr.frameStyle, 280)}`);
  }

  const rw = preset.fal?.sheetRewrite;
  if (rw && typeof rw === "object") {
    lines.push(`fal.sheetRewrite.enabled: ${rw.enabled !== false ? "yes" : "no"}`);
    if (typeof rw.systemPrompt === "string" && rw.systemPrompt.trim()) {
      lines.push(`fal.sheetRewrite.systemPrompt: ${truncateEllipsis(rw.systemPrompt, 320)}`);
    }
  }

  if (typeof pr.sheetPromptBuilder === "function") {
    try {
      const sample = pr.sheetPromptBuilder({
        sheetWidth: preset.sheet?.width ?? preset.tileSize * 2,
        sheetHeight: preset.sheet?.height ?? preset.tileSize * 2,
        chromaKeyHex: "#FF00FF",
      });
      if (typeof sample === "string" && sample.trim()) {
        lines.push(`sheetPromptBuilder(sample, no rewrite): ${truncateEllipsis(sample, 400)}`);
      }
    } catch {
      lines.push(`sheetPromptBuilder(sample): (error building sample)`);
    }
  }

  return lines;
}

/**
 * @param {string} repoRoot
 * @param {string} outBaseAbs
 * @param {{ publicArtDir: string; manifestRelative: string; sheetBasename: string; presetModuleHref: string }} entry
 * @param {import('./pipeline.ts').PipelinePreset} preset
 * @param {{ prompts: boolean }} opts
 * @returns {Promise<string[]>}
 */
export async function buildInfoLines(repoRoot, outBaseAbs, entry, preset, opts) {
  /** @type {string[]} */
  const lines = [];

  const presetAbs = fileURLToPath(entry.presetModuleHref);
  const presetRel = relative(repoRoot, presetAbs).split("\\").join("/");
  const artDirRel = entry.publicArtDir;

  lines.push(`preset module: ${presetRel}`);
  lines.push(`outBase: ${outBaseAbs}`);
  lines.push("");

  lines.push("## Git-tracked files");
  const tracked = gitTrackedFilesUnderArtDir(repoRoot, artDirRel);
  if (tracked.ok) {
    if (tracked.files.length === 0) {
      lines.push(`  (none under ${artDirRel}/ — untracked or empty)`);
    } else {
      for (const f of tracked.files) {
        lines.push(`  ${f}`);
      }
    }
  } else {
    lines.push(`  (git unavailable: ${tracked.error})`);
  }
  lines.push("");

  const manifestPath = join(outBaseAbs, entry.manifestRelative);
  const sheetPath = join(outBaseAbs, entry.sheetBasename);
  const spriteRefPath = join(outBaseAbs, preset.spriteRef?.jsonRelativePath ?? "sprite-ref.json");

  lines.push("## On-disk files");
  for (const [label, p] of /** @type {const} */ ([
    ["manifest.json", manifestPath],
    ["sprite-ref.json", spriteRefPath],
    ["sheet.png", sheetPath],
  ])) {
    if (!existsSync(p)) {
      lines.push(`  ${label}: missing`);
      continue;
    }
    let extra = "";
    try {
      const st = statSync(p);
      extra = ` (${st.size} bytes)`;
      if (label === "sheet.png") {
        const dim = readPngIhdrDimensions(p);
        if (dim) extra = ` (${dim.width}×${dim.height}px, ${st.size} bytes)`;
      }
    } catch {
      /* ignore */
    }
    lines.push(`  ${label}: present${extra}`);
  }
  lines.push("");

  /** @type {Record<string, unknown> | null} */
  let manifestObj = null;
  lines.push("## manifest.json (summary)");
  if (!existsSync(manifestPath)) {
    lines.push("  (file missing)");
  } else {
    try {
      const raw = await readFile(manifestPath, "utf8");
      const j = JSON.parse(raw);
      const o = asObject(j);
      manifestObj = o;
      if (!o) lines.push("  (invalid JSON object)");
      else for (const s of summarizeManifest(o)) lines.push(`  ${s}`);
    } catch (e) {
      lines.push(`  (read error: ${e instanceof Error ? e.message : e})`);
    }
  }
  lines.push("");

  lines.push("## sprite-ref.json (summary)");
  if (!existsSync(spriteRefPath)) {
    lines.push("  (file missing)");
  } else {
    try {
      const raw = await readFile(spriteRefPath, "utf8");
      const j = JSON.parse(raw);
      const o = asObject(j);
      if (!o) lines.push("  (invalid JSON object)");
      else {
        const sum = summarizeSpriteRef(o);
        if (sum.length === 0) lines.push("  (no recognized grid/image summary)");
        else for (const s of sum) lines.push(`  ${s}`);
      }
    } catch (e) {
      lines.push(`  (read error: ${e instanceof Error ? e.message : e})`);
    }
  }
  lines.push("");

  lines.push("## Preset (loaded via createPreset)");
  lines.push(`  presetId: ${preset.presetId}`);
  lines.push(`  kind: ${preset.kind}`);
  lines.push(`  tileSize: ${preset.tileSize}`);
  if (preset.fal?.defaultEndpoint) lines.push(`  fal.defaultEndpoint: ${preset.fal.defaultEndpoint}`);
  for (const s of summarizePresetPrompts(preset, opts.prompts)) {
    lines.push(`  ${s}`);
  }

  const specs = manifestObj ? asObject(manifestObj.specs) : null;
  const mTile = specs ? asObject(specs.tileSize) : null;
  const mw = mTile && typeof mTile.width === "number" ? mTile.width : null;
  if (mw != null && mw !== preset.tileSize) {
    lines.push(
      `  note: manifest tileSize.width (${mw}) ≠ preset.tileSize (${preset.tileSize}) — typical when sheetNativeRaster kept fal/BRIA dimensions.`,
    );
  }

  return lines;
}
