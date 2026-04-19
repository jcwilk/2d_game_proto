#!/usr/bin/env node
/**
 * Unified sprite-sheet CLI — registry-driven **`run`**, **`list`**, **`status`**, **`info`**, **`rename`**, **`help`**.
 *
 * @see tools/sprite-generation/presets/registry.ts
 * @see tools/sprite-generation/pipeline.ts
 */

import { ApiError } from "@fal-ai/client";
import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { formatFalClientError } from "./sprite-generation/generators/fal.ts";
import { log } from "./sprite-generation/logging.ts";
import { runPipeline } from "./sprite-generation/pipeline.ts";
import { DEFAULT_CHROMA_KEY_HEX } from "./sprite-generation/prompt.ts";
import { buildInfoLines, parseInfoArgs } from "./sprite-generation/info.ts";
import {
  buildRenameDryRunPlan,
  formatRenameDryRunPlan,
  parseRenameArgs,
} from "./sprite-generation/rename-dry-run.ts";
import { PRESETS, resolveRepoRoot } from "./sprite-generation/presets/registry.ts";

const REPO_ROOT = resolveRepoRoot(import.meta.url);
const PROVENANCE_TOOL = "tools/generate-spritesheet.mjs";
const PROVENANCE_VERSION = 1;

/** Repo-root `.env` for fal keys; skipped if missing. Does not override vars already in `process.env`. */
function loadRepoDotenv() {
  const p = join(REPO_ROOT, ".env");
  if (existsSync(p)) {
    process.loadEnvFile(p);
  }
}

/** Fallback when a preset module omits `CHROMA_TOLERANCE_DEFAULT` (matches dpad-workflow default). */
const FALLBACK_CHROMA_TOLERANCE = 72;

/**
 * Map CLI `--mode mock|live` to `runPipeline` mode. **`live` → `generate`** (single place).
 *
 * @param {'mock' | 'live'} cliMode
 * @returns {'mock' | 'generate'}
 */
export function mapCliModeToPipelineMode(cliMode) {
  if (cliMode === "live") return "generate";
  if (cliMode === "mock") return "mock";
  throw new Error(`mapCliModeToPipelineMode: expected mock|live, got ${JSON.stringify(cliMode)}`);
}

/**
 * @param {string[]} argvSlice argv after `run`
 * @returns {{ asset?: string; mode?: 'mock' | 'live'; outBase?: string; strategy?: 'sheet' | 'per-tile' }}
 */
export function parseRunArgs(argvSlice) {
  /** @type {{ asset?: string; mode?: 'mock' | 'live'; outBase?: string; strategy?: 'sheet' | 'per-tile' }} */
  const opts = {};
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
      case "--mode":
        opts.mode = /** @type {'mock'|'live'} */ (next());
        if (opts.mode !== "mock" && opts.mode !== "live") {
          throw new Error('--mode must be "mock" or "live"');
        }
        break;
      case "--out-base":
        opts.outBase = next();
        break;
      case "--strategy":
        opts.strategy = /** @type {'sheet'|'per-tile'} */ (next());
        if (opts.strategy !== "sheet" && opts.strategy !== "per-tile") {
          throw new Error('--strategy must be "sheet" or "per-tile"');
        }
        break;
      default:
        throw new Error(`Unknown argument: ${a} (use: generate-spritesheet help run)`);
    }
  }
  return opts;
}

/**
 * @param {string} outBaseRaw
 * @returns {string} Absolute out directory (repo-relative segments resolved from repo root)
 */
function resolveOutBase(outBaseRaw) {
  if (outBaseRaw.startsWith("/") || /^[A-Za-z]:[\\/]/.test(outBaseRaw)) {
    return resolve(outBaseRaw);
  }
  return resolve(REPO_ROOT, outBaseRaw);
}

function parseHexRgb(hex) {
  const s = String(hex).trim();
  const m = /^#?([0-9a-fA-F]{6})$/.exec(s);
  if (!m) throw new Error(`invalid hex color: ${hex}`);
  const n = Number.parseInt(m[1], 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

/**
 * @param {string} assetId
 * @param {string} outBaseAbs
 * @param {'mock' | 'generate'} pipelineMode
 * @param {'sheet' | 'per-tile'} strategy
 */
async function runForAsset(assetId, outBaseAbs, pipelineMode, strategy) {
  const entry = PRESETS[/** @type {keyof typeof PRESETS} */ (assetId)];
  if (!entry) {
    throw new Error(`unknown asset: ${JSON.stringify(assetId)} (see: list)`);
  }
  const mod = await import(entry.presetModuleHref);
  const preset = mod.createPreset({
    outBase: outBaseAbs,
    provenanceTool: PROVENANCE_TOOL,
    provenanceVersion: PROVENANCE_VERSION,
  });

  const chromaTolerance =
    "CHROMA_TOLERANCE_DEFAULT" in mod
      ? /** @type {number} */ (mod.CHROMA_TOLERANCE_DEFAULT)
      : FALLBACK_CHROMA_TOLERANCE;

  const baseOpts = {
    mode: pipelineMode,
    strategy,
    dryRun: false,
    skipQa: false,
    quiet: false,
    chromaKeyHex: DEFAULT_CHROMA_KEY_HEX,
    chromaTolerance,
  };

  await runPipeline(preset, {
    ...baseOpts,
    endpoint: mod.DEFAULT_FAL_ENDPOINT,
    imageSize: `${mod.TILE_SIZE}x${mod.TILE_SIZE}`,
    keepSheet: Boolean(preset.sheetOnlyOutput),
    savePreChroma: false,
    sheetRewrite: undefined,
  });
}

function printHelpGeneral() {
  console.log(`Usage: node tools/generate-spritesheet.mjs <command> [options]

Commands:
  run      Generate sprites (requires --asset and --mode mock|live)
  list     List registered assets and default output directories
  status   Manifest/sheet presence, generation mode, staleness hint
  info     Summarize one asset (git-tracked art files, manifest/sprite-ref, preset prompts)
  rename   Plan renaming an asset slug (MVP: --dry-run only)
  help     Show help (try: help run)

Examples:
  node tools/generate-spritesheet.mjs run --asset <id> --mode mock
  node tools/generate-spritesheet.mjs run --asset <id> --mode live
  node tools/generate-spritesheet.mjs info --asset <id>

If .env exists at the repo root, it is loaded automatically (FAL_KEY, etc.). Existing
environment variables are not overwritten. You can still use node --env-file=... if needed.
`);
}

function printHelpRun() {
  console.log(`Usage: node tools/generate-spritesheet.mjs run --asset <id> --mode mock|live [options]

Required:
  --asset <id>           Asset id from the registry (see: list)
  --mode mock|live       mock = local deterministic; live = fal pipeline (maps to internal generate)

Optional:
  --out-base <path>      Output directory (absolute or repo-relative); default: public/art/<asset>/
  --strategy sheet|per-tile   Overrides registry default when set

Environment (live):
  FAL_KEY or FAL_KEY_ID + FAL_KEY_SECRET
  Set in the shell or in repo-root .env (loaded automatically when the file exists).
`);
}

function printHelpList() {
  console.log(`Usage: node tools/generate-spritesheet.mjs list

Prints registered asset ids and their default output directories (registry).
`);
}

function printHelpStatus() {
  console.log(`Usage: node tools/generate-spritesheet.mjs status

Per asset: manifest and sheet presence, generationRecipe.mode when present,
and staleness (git timestamps preset vs art, else mtime, else unknown).
`);
}

function printHelpInfo() {
  console.log(`Usage: node tools/generate-spritesheet.mjs info --asset <id> [options]

Shows one asset: git-tracked paths under public/art/<id>/, on-disk manifest /
sprite-ref / sheet sizes, and a loaded-preset summary (frame list, sheet grid,
truncated prompt excerpts). Prompt text comes from createPreset() in memory, not
by parsing the preset `.ts` file as text.

Required:
  --asset <id>           Registry asset id (see: list)

Optional:
  --out-base <path>      Same as run: inspect that directory instead of the default
  --no-prompts           Omit long sheet/frame/rewrite prompt excerpts
`);
}

function printHelpRename() {
  console.log(`Usage: node tools/generate-spritesheet.mjs rename --dry-run --from <slug> --to <slug>

Prints a migration plan (directory renames, preset module path, registry notes,
and candidate file references). Does not modify the repo. Blocklisted and
colliding --to slugs are rejected. No --apply in MVP.

Required:
  --dry-run              Only supported mode for rename (no writes)
  --from <slug>          Existing registry asset id
  --to <slug>            New slug (not blocklisted, not an existing asset)
`);
}

/**
 * @param {string | undefined} topic
 */
function printHelp(topic) {
  if (!topic || topic === "help") {
    printHelpGeneral();
    return;
  }
  switch (topic) {
    case "run":
      printHelpRun();
      break;
    case "list":
      printHelpList();
      break;
    case "status":
      printHelpStatus();
      break;
    case "info":
      printHelpInfo();
      break;
    case "rename":
      printHelpRename();
      break;
    default:
      console.error(`No help for "${topic}". Try: help run | list | status | info | rename`);
      process.exit(1);
  }
}

/**
 * @param {string} repoRoot
 * @param {string} relFromRepo
 * @returns {number | null} Unix ms, or null if unavailable
 */
function gitLastCommitTimeMs(repoRoot, relFromRepo) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%ct", "--", relFromRepo], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const s = out.trim();
    if (!s) return null;
    const sec = Number.parseInt(s, 10);
    return Number.isNaN(sec) ? null : sec * 1000;
  } catch {
    return null;
  }
}

/**
 * @param {string} absPath
 * @returns {number | null}
 */
function safeMtimeMs(absPath) {
  try {
    if (!existsSync(absPath)) return null;
    return statSync(absPath).mtimeMs;
  } catch {
    return null;
  }
}

/**
 * @param {string} presetRel
 * @param {string[]} artRelPaths
 * @returns {'stale' | 'fresh' | 'unknown'}
 */
function computeStale(repoRoot, presetRel, artRelPaths) {
  const tPresetGit = gitLastCommitTimeMs(repoRoot, presetRel);
  const tArtsGit = artRelPaths.map((p) => gitLastCommitTimeMs(repoRoot, p));
  const maxArtGit = Math.max(...tArtsGit.map((t) => (t == null ? -Infinity : t)));
  if (tPresetGit != null && maxArtGit !== -Infinity) {
    return tPresetGit > maxArtGit ? "stale" : "fresh";
  }

  const presetAbs = join(repoRoot, presetRel);
  const tPresetM = safeMtimeMs(presetAbs);
  const artMs = artRelPaths.map((p) => safeMtimeMs(join(repoRoot, p)));
  if (tPresetM == null) return "unknown";
  const maxArtM = Math.max(...artMs.map((t) => (t == null ? -Infinity : t)));
  if (maxArtM === -Infinity) return "unknown";
  return tPresetM > maxArtM ? "stale" : "fresh";
}

async function cmdList() {
  for (const id of Object.keys(PRESETS)) {
    const e = PRESETS[/** @type {keyof typeof PRESETS} */ (id)];
    console.log(`${id}\tdefaultOutBase=${e.defaultOutBase}\tdefaultStrategy=${e.defaultStrategy}`);
  }
}

async function cmdStatus() {
  for (const id of Object.keys(PRESETS)) {
    const e = PRESETS[/** @type {keyof typeof PRESETS} */ (id)];
    const manifestPath = join(e.defaultOutBase, e.manifestRelative);
    const sheetPath = join(e.defaultOutBase, e.sheetBasename);
    const hasManifest = existsSync(manifestPath);
    const hasSheet = existsSync(sheetPath);

    let modeLabel = "—";
    if (hasManifest) {
      try {
        const { readFile } = await import("node:fs/promises");
        const raw = await readFile(manifestPath, "utf8");
        const j = JSON.parse(raw);
        const m = j?.generationRecipe?.mode;
        modeLabel = m === undefined || m === null ? "—" : String(m);
      } catch {
        modeLabel = "—";
      }
    }

    const presetAbs = fileURLToPath(e.presetModuleHref);
    const presetRel = relative(REPO_ROOT, presetAbs).split("\\").join("/");
    const artManifestRel = join(e.publicArtDir, e.manifestRelative).split("\\").join("/");
    const artSheetRel = join(e.publicArtDir, e.sheetBasename).split("\\").join("/");

    const stale = computeStale(REPO_ROOT, presetRel, [artManifestRel, artSheetRel]);

    console.log(
      `${id}: manifest=${hasManifest ? "yes" : "no"} sheet=${hasSheet ? "yes" : "no"} generationRecipe.mode=${modeLabel} stale=${stale}`,
    );
  }
}

/**
 * @param {string[]} argv
 */
async function cmdInfo(argv) {
  const slice = argv.slice(3);
  let parsed;
  try {
    parsed = parseInfoArgs(slice);
  } catch (e) {
    console.error(`error: ${e instanceof Error ? e.message : e}`);
    printHelpInfo();
    process.exit(1);
  }
  if (!parsed.asset) {
    console.error("error: info requires --asset <id>");
    printHelpInfo();
    process.exit(1);
  }

  const entry = PRESETS[/** @type {keyof typeof PRESETS} */ (parsed.asset)];
  if (!entry) {
    console.error(`error: unknown asset: ${JSON.stringify(parsed.asset)}`);
    process.exit(1);
  }

  const outBaseAbs = parsed.outBase ? resolveOutBase(parsed.outBase) : entry.defaultOutBase;
  const mod = await import(entry.presetModuleHref);
  const preset = mod.createPreset({
    outBase: outBaseAbs,
    provenanceTool: PROVENANCE_TOOL,
    provenanceVersion: PROVENANCE_VERSION,
  });

  const lines = await buildInfoLines(REPO_ROOT, outBaseAbs, entry, preset, {
    prompts: parsed.prompts,
  });
  console.log(`asset: ${parsed.asset}\n`);
  console.log(lines.join("\n"));
}

async function cmdRename(argv) {
  const slice = argv.slice(3);
  let parsed;
  try {
    parsed = parseRenameArgs(slice);
  } catch (e) {
    console.error(`error: ${e instanceof Error ? e.message : e}`);
    printHelpRename();
    process.exit(1);
  }
  if (!parsed.dryRun) {
    console.error("error: only rename --dry-run is supported (MVP); --apply is not available");
    printHelpRename();
    process.exit(1);
  }
  if (!parsed.from || !parsed.to) {
    console.error("error: rename --dry-run requires --from <slug> and --to <slug>");
    printHelpRename();
    process.exit(1);
  }

  const registryAssetIds = Object.keys(PRESETS);
  const plan = buildRenameDryRunPlan(REPO_ROOT, parsed.from, parsed.to, registryAssetIds);
  if (!plan.ok) {
    console.error(`error: ${plan.error}`);
    process.exit(1);
  }
  console.log(formatRenameDryRunPlan(plan));
}

async function cmdRun(argv) {
  const slice = argv.slice(3);
  let parsed;
  try {
    parsed = parseRunArgs(slice);
  } catch (e) {
    console.error(`error: ${e instanceof Error ? e.message : e}`);
    printHelpRun();
    process.exit(1);
  }
  if (!parsed.asset) {
    console.error("error: --asset is required");
    printHelpRun();
    process.exit(1);
  }
  if (!parsed.mode) {
    console.error("error: --mode is required (mock or live)");
    printHelpRun();
    process.exit(1);
  }

  const entry = PRESETS[/** @type {keyof typeof PRESETS} */ (parsed.asset)];
  if (!entry) {
    console.error(`error: unknown asset: ${JSON.stringify(parsed.asset)}`);
    process.exit(1);
  }

  const outBaseAbs = parsed.outBase ? resolveOutBase(parsed.outBase) : entry.defaultOutBase;
  const strategy = parsed.strategy ?? entry.defaultStrategy;
  const pipelineMode = mapCliModeToPipelineMode(parsed.mode);

  if (pipelineMode === "generate") {
    try {
      parseHexRgb(DEFAULT_CHROMA_KEY_HEX);
    } catch (e) {
      console.error(`error: invalid default chroma key: ${e instanceof Error ? e.message : e}`);
      process.exit(1);
    }
  }

  try {
    await runForAsset(parsed.asset, outBaseAbs, pipelineMode, strategy);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("FAL credentials missing")) {
      process.exit(2);
    }
    throw e;
  }
}

async function main() {
  loadRepoDotenv();
  const argv = process.argv;
  const cmd = argv[2];

  if (cmd === "help" || cmd === "--help" || cmd === "-h") {
    printHelp(argv[3]);
    process.exit(0);
  }

  switch (cmd) {
    case "run":
      await cmdRun(argv);
      break;
    case "list":
      await cmdList();
      break;
    case "status":
      await cmdStatus();
      break;
    case "info":
      await cmdInfo(argv);
      break;
    case "rename":
      await cmdRename(argv);
      break;
    case undefined:
      console.error("error: missing command (run | list | status | info | rename | help)");
      printHelpGeneral();
      process.exit(1);
      break;
    default:
      console.error(`error: unknown command: ${cmd}`);
      printHelpGeneral();
      process.exit(1);
  }
}

const _entry = process.argv[1] && resolve(process.argv[1]);
if (_entry && import.meta.url === pathToFileURL(_entry).href) {
  main().catch((e) => {
    const msg = e instanceof ApiError ? formatFalClientError(e) : e instanceof Error ? e.message : String(e);
    log("ERROR", "fatal", msg, { stack: e instanceof Error ? e.stack : undefined });
    process.exit(1);
  });
}
