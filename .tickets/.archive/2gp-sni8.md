---
id: 2gp-sni8
status: closed
deps: []
links: []
created: 2026-03-29T17:54:34Z
type: epic
priority: 2
assignee: user.email
---
# Epic: generate-spritesheet skill, CLI, registry, preset contract

Add a canonical Node entry point (tools/generate-spritesheet.mjs), hierarchical preset folders under tools/sprite-generation/presets/<assetId>/, a frozen registry (resolveRepoRoot, file: URLs for dynamic import), a normative preset module contract (ASSET_ID, MANIFEST_PRESET_ID, KIND, createPreset, recipeId), Cursor skill .cursor/skills/generate-spritesheet/SKILL.md, and documentation. Authoritative planning context: .cursor/plans/generate-spritesheet_skill_adb42631.plan.md plus critique-and-refine refined spec (terminology assetId vs manifestPresetId; CLI live maps to pipeline generate; presetModuleHref; staleness heuristic). Close epic when all children are closed.

## Child tickets

- `2gp-ggcc` — preset layout and contract
- `2gp-wur1` — registry + `resolveRepoRoot`
- `2gp-zhra` — CLI
- `2gp-b82a` — skill + doc pointers
- `2gp-qsnl` — optional rename `--dry-run`
- `2gp-l04o` — typecheck, tests, smoke

