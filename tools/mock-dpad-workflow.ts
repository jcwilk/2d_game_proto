#!/usr/bin/env node
/**
 * Back-compat shim: forwards to dpad-workflow.ts in mock mode using the Node 22
 * `--experimental-strip-types` runner (see 2gp-gwjc / AGENTS.md).
 * Prefer: npm run mock:dpad-workflow
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Must match package.json / 2gp-gwjc: `node --experimental-strip-types <tools/*.ts> …` */
const NODE_TS_RUNNER_FLAGS = ["--experimental-strip-types"] as const;

const root = dirname(fileURLToPath(import.meta.url));
const r = spawnSync(process.execPath, [...NODE_TS_RUNNER_FLAGS, join(root, "dpad-workflow.ts"), "--mode", "mock", ...process.argv.slice(2)], {
  stdio: "inherit",
});
process.exit(r.status ?? 1);
