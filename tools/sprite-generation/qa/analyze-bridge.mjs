#!/usr/bin/env node
/**
 * QA bridge: run `tools/png-analyze.mjs` against a PNG and write stdout JSON to a sidecar file.
 * Mirrors `runPngAnalyze` in `tools/dpad-workflow.mjs` (paths, argv, exit propagation, stdout capture).
 *
 * **Repo root:** this file lives at `tools/sprite-generation/qa/analyze-bridge.mjs`. The bridge resolves
 * the analyzer script as `join(repoRoot, "tools", "png-analyze.mjs")` where `repoRoot` is three
 * `dirname` steps from `import.meta.url` (`qa` → `sprite-generation` → `tools` → repository root).
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..", "..");

function pngAnalyzeScriptPath() {
  return join(REPO_ROOT, "tools", "png-analyze.mjs");
}

/**
 * @param {string} absPngPath Absolute path to the PNG to analyze
 * @param {string} absJsonOut Absolute path for the sidecar JSON (same content as png-analyze stdout)
 * @param {number} spriteWidth Grid cell width for `--sprite-width`
 * @param {number} spriteHeight Grid cell height for `--sprite-height`
 */
export function runPngAnalyzeBridge(absPngPath, absJsonOut, spriteWidth, spriteHeight) {
  const pngAnalyze = pngAnalyzeScriptPath();
  const out = execFileSync(process.execPath, [pngAnalyze, absPngPath, "--sprite-width", String(spriteWidth), "--sprite-height", String(spriteHeight)], {
    encoding: "utf8",
  });
  writeFileSync(absJsonOut, out, "utf8");
}

/** Exposed for tests that assert argv / path resolution matches the monolith. */
export function getPngAnalyzeScriptPathForTests() {
  return pngAnalyzeScriptPath();
}
