---
id: 2gp-zhra
status: open
deps: [2gp-wur1]
links: []
created: 2026-03-29T17:54:41Z
type: feature
priority: 1
assignee: user.email
parent: 2gp-sni8
---
# CLI tools/generate-spritesheet.mjs

Implement `tools/generate-spritesheet.mjs` with subcommands `run`, `list`, `status`, and `help` (support `help` and `help <subcommand>`, e.g. `help run`, matching the plan). `run` requires `--asset <assetId>` and `--mode mock|live` (no default for mode). Map `live` → pipeline mode `generate` in a single helper. Optional `--out-base`, `--strategy`. `list` prints registered assets and default output dirs from the registry. `status`: manifest and sheet presence; `generationRecipe.mode` when present; staleness: prefer `git log` timestamps on preset main file vs art outputs, then mtime fallback, then `unknown` if git is unavailable or paths are untracked. Parse style similar to `tools/dpad-workflow.mjs`. Add `package.json` script `generate:spritesheet` pointing at this file.

## Acceptance Criteria

- `node tools/generate-spritesheet.mjs help` exits 0; `help run` (or equivalent) exits 0.
- `run` without `--mode` exits non-zero with usage; `run` without `--asset` exits non-zero with usage.
- Mock run succeeds with `--out-base` pointing at a temp directory (tests may use the same pattern as pipeline tests).
- `list` and `status` exit 0 in a clean checkout.
- Tests cover argv parsing and assert `live` maps to `generate` exactly once in the mapping layer.
- `npm run generate:spritesheet -- help` exits 0 after the script is wired (npm passes args after `--`).

