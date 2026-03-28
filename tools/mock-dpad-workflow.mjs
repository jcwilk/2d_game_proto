#!/usr/bin/env node
/**
 * Back-compat shim: forwards to dpad-workflow.mjs in mock mode.
 * Prefer: node tools/dpad-workflow.mjs --mode mock
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const r = spawnSync(process.execPath, [join(root, "dpad-workflow.mjs"), "--mode", "mock", ...process.argv.slice(2)], {
  stdio: "inherit",
});
process.exit(r.status ?? 1);
