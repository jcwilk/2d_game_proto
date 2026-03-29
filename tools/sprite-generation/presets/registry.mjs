/**
 * Central registry for sprite-generation preset modules (`presets/<assetId>/<assetId>.mjs`).
 *
 * @see `../preset-contract.mjs` — `SpritePresetModule`
 */

import { existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * Walk upward from `fromUrl` until a directory containing `package.json` is found.
 *
 * @param {string} [fromUrl=import.meta.url] Module URL to start from (e.g. this file).
 * @returns {string} Absolute filesystem path to the repository root.
 */
export function resolveRepoRoot(fromUrl = import.meta.url) {
  let dir = dirname(fileURLToPath(fromUrl));
  for (;;) {
    if (existsSync(join(dir, "package.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(
        `resolveRepoRoot: no package.json found walking up from ${fileURLToPath(fromUrl)}`,
      );
    }
    dir = parent;
  }
}

/**
 * @typedef {'dpad' | 'character'} AssetId
 */

/**
 * @typedef {object} RegistryEntry
 * @property {string} manifestPresetId Manifest `preset` string (not `PipelinePreset.presetId` in docs).
 * @property {string} presetModuleHref Absolute `file:` URL for `import()` of the preset module.
 * @property {string} defaultOutBase Absolute out dir (manifest, sprite-ref, tiles/sheet) — default `public/art/<assetId>/`.
 * @property {string} publicArtDir Repo-relative POSIX path (`public/art/<assetId>`).
 * @property {string} manifestRelative Path segment(s) under `publicArtDir` to `manifest.json`.
 * @property {string} sheetBasename Default sheet PNG basename (e.g. `sheet.png`).
 * @property {'sheet' | 'per-tile'} defaultStrategy Default CLI `--strategy`.
 */

/** @type {Record<AssetId, RegistryEntry>} */
const _PRESETS = buildPresets(resolveRepoRoot());

export const PRESETS = /** @type {Readonly<Record<AssetId, RegistryEntry>>} */ (
  Object.freeze({
    dpad: Object.freeze(_PRESETS.dpad),
    character: Object.freeze(_PRESETS.character),
  })
);

/**
 * @param {string} repoRoot
 * @returns {Record<AssetId, RegistryEntry>}
 */
function buildPresets(repoRoot) {
  /** @param {AssetId} assetId */
  function entry(assetId, manifestPresetId, defaultStrategy) {
    const publicArtDir = `public/art/${assetId}`;
    const presetPath = join(
      repoRoot,
      "tools",
      "sprite-generation",
      "presets",
      assetId,
      `${assetId}.mjs`,
    );
    return {
      manifestPresetId,
      presetModuleHref: pathToFileURL(presetPath).href,
      defaultOutBase: join(repoRoot, "public", "art", assetId),
      publicArtDir,
      manifestRelative: "manifest.json",
      sheetBasename: "sheet.png",
      defaultStrategy,
    };
  }
  return {
    dpad: entry("dpad", "dpad_four_way", "sheet"),
    character: entry("character", "character_walk", "sheet"),
  };
}

/**
 * @param {string} href
 * @param {string} repoRoot
 */
function assertFileUrlUnderRepoRoot(href, repoRoot) {
  let u;
  try {
    u = new URL(href);
  } catch (e) {
    throw new Error(`invalid presetModuleHref: ${href}`, { cause: e });
  }
  if (u.protocol !== "file:") {
    throw new Error(`expected file: URL, got ${u.protocol} for ${href}`);
  }
  const p = fileURLToPath(href);
  const resolved = resolve(p);
  const rr = resolve(repoRoot);
  const rel = relative(rr, resolved);
  if (rel === "" || rel.startsWith("..")) {
    throw new Error(`preset path not under repo root: ${p} (repo ${rr})`);
  }
}

/**
 * @param {string} repoRoot
 * @param {Readonly<Record<AssetId, RegistryEntry>>} presets
 */
async function assertRegistryStrict(repoRoot, presets) {
  for (const id of /** @type {AssetId[]} */ (Object.keys(presets))) {
    const e = presets[id];
    assertFileUrlUnderRepoRoot(e.presetModuleHref, repoRoot);
    const pathFs = fileURLToPath(e.presetModuleHref);
    if (!existsSync(pathFs)) {
      throw new Error(`SPRITESHEET registry: preset module missing on disk: ${pathFs}`);
    }
    const mod = await import(e.presetModuleHref);
    if (mod.ASSET_ID !== id) {
      throw new Error(
        `SPRITESHEET registry: key "${id}" preset exports ASSET_ID ${JSON.stringify(mod.ASSET_ID)}`,
      );
    }
    if (mod.MANIFEST_PRESET_ID !== e.manifestPresetId) {
      throw new Error(
        `SPRITESHEET registry: ${id} manifestPresetId ${JSON.stringify(e.manifestPresetId)} !== module MANIFEST_PRESET_ID ${JSON.stringify(mod.MANIFEST_PRESET_ID)}`,
      );
    }
  }
}

const _repoRoot = resolveRepoRoot();
const _strict =
  process.env.SPRITESHEET_REGISTRY_STRICT === "1" || process.env.NODE_ENV === "test";

if (_strict) {
  await assertRegistryStrict(_repoRoot, PRESETS);
}
