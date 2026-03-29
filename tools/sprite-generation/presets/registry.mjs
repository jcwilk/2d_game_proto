/**
 * Central registry for sprite-generation preset modules (`presets/<slug>/<slug>.mjs`).
 *
 * Preset keys are discovered at load time from directories under `presets/` that contain
 * `<slug>/<slug>.mjs`.
 *
 * @see `../preset-contract.mjs` — `SpritePresetModule`
 */

import { existsSync, readdirSync } from "node:fs";
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
 * @typedef {object} RegistryEntry
 * @property {string} manifestPresetId Manifest `preset` string (not `PipelinePreset.presetId` in docs).
 * @property {string} presetModuleHref Absolute `file:` URL for `import()` of the preset module.
 * @property {string} defaultOutBase Absolute out dir (manifest, sprite-ref, tiles/sheet) — default `public/art/<slug>/`.
 * @property {string} publicArtDir Repo-relative POSIX path (`public/art/<slug>`).
 * @property {string} manifestRelative Path segment(s) under `publicArtDir` to `manifest.json`.
 * @property {string} sheetBasename Default sheet PNG basename (e.g. `sheet.png`).
 * @property {'sheet' | 'per-tile'} defaultStrategy Default CLI `--strategy` (from module `DEFAULT_STRATEGY` or `"sheet"`).
 */

/**
 * @param {string} repoRoot
 * @returns {Promise<Record<string, RegistryEntry>>}
 */
async function buildPresets(repoRoot) {
  const presetsDir = join(repoRoot, "tools", "sprite-generation", "presets");
  const dirents = readdirSync(presetsDir, { withFileTypes: true });
  /** @type {string[]} */
  const slugs = [];
  for (const ent of dirents) {
    if (!ent.isDirectory() || ent.name.startsWith(".")) continue;
    const slug = ent.name;
    const modulePath = join(presetsDir, slug, `${slug}.mjs`);
    if (!existsSync(modulePath)) continue;
    slugs.push(slug);
  }
  slugs.sort((a, b) => a.localeCompare(b));

  /** @type {Record<string, RegistryEntry>} */
  const out = {};
  for (const slug of slugs) {
    const presetPath = join(presetsDir, slug, `${slug}.mjs`);
    const href = pathToFileURL(presetPath).href;
    const mod = await import(href);
    if (mod.ASSET_ID !== slug) {
      throw new Error(
        `SPRITESHEET registry: directory ${JSON.stringify(slug)} !== module ASSET_ID ${JSON.stringify(mod.ASSET_ID)}`,
      );
    }
    if (typeof mod.MANIFEST_PRESET_ID !== "string" || !mod.MANIFEST_PRESET_ID) {
      throw new Error(`SPRITESHEET registry: ${slug} missing MANIFEST_PRESET_ID`);
    }
    if (typeof mod.KIND !== "string" || !mod.KIND) {
      throw new Error(`SPRITESHEET registry: ${slug} missing KIND`);
    }
    const defaultStrategy = mod.DEFAULT_STRATEGY ?? "sheet";
    if (defaultStrategy !== "sheet" && defaultStrategy !== "per-tile") {
      throw new Error(
        `SPRITESHEET registry: ${slug} DEFAULT_STRATEGY must be "sheet" or "per-tile", got ${JSON.stringify(defaultStrategy)}`,
      );
    }
    out[slug] = {
      manifestPresetId: mod.MANIFEST_PRESET_ID,
      presetModuleHref: href,
      defaultOutBase: join(repoRoot, "public", "art", slug),
      publicArtDir: `public/art/${slug}`,
      manifestRelative: "manifest.json",
      sheetBasename: "sheet.png",
      defaultStrategy,
    };
  }
  return out;
}

const _repoRoot = resolveRepoRoot();
const _PRESETS = await buildPresets(_repoRoot);

export const PRESETS = /** @type {Readonly<Record<string, RegistryEntry>>} */ (
  Object.freeze(
    Object.fromEntries(
      Object.entries(_PRESETS).map(([k, v]) => [k, Object.freeze(v)]),
    ),
  )
);

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
 * @param {Readonly<Record<string, RegistryEntry>>} presets
 */
async function assertRegistryStrict(repoRoot, presets) {
  for (const id of Object.keys(presets)) {
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
    if (typeof mod.KIND !== "string" || !mod.KIND) {
      throw new Error(`SPRITESHEET registry: ${id} missing or invalid KIND`);
    }
    const expectedStrategy = mod.DEFAULT_STRATEGY ?? "sheet";
    if (e.defaultStrategy !== expectedStrategy) {
      throw new Error(
        `SPRITESHEET registry: ${id} defaultStrategy ${JSON.stringify(e.defaultStrategy)} !== module DEFAULT_STRATEGY (effective ${JSON.stringify(expectedStrategy)})`,
      );
    }
  }
}

const _strict =
  process.env.SPRITESHEET_REGISTRY_STRICT === "1" || process.env.NODE_ENV === "test";

if (_strict) {
  await assertRegistryStrict(_repoRoot, PRESETS);
}
