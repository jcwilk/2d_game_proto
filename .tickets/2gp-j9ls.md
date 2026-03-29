---
id: 2gp-j9ls
status: closed
deps: []
links: []
created: 2026-03-29T18:48:10Z
type: feature
priority: 1
assignee: user.email
parent: 2gp-zxol
---
# Auto-discover preset modules and relax slug regex

Replace manual PRESETS / AssetId in registry.mjs with load-time scan of presets/*/ for <slug>/<slug>.mjs, dynamic import for ASSET_ID, MANIFEST_PRESET_ID, KIND, optional DEFAULT_STRATEGY (fallback sheet). Export Record<string, RegistryEntry>. In rename-dry-run.mjs update SLUG_RE only to /^[a-z][a-z0-9_-]*[a-z0-9]$/. Update preset-contract.mjs JSDoc: DEFAULT_STRATEGY, generic ASSET_ID line.

## Design

tools/sprite-generation/presets/registry.mjs; tools/sprite-generation/rename-dry-run.mjs (regex only); tools/sprite-generation/preset-contract.mjs

## Acceptance Criteria

PRESETS built only from discovered modules; assertRegistryStrict passes in test mode; hyphenated slug accepted by SLUG_RE test; contract documents DEFAULT_STRATEGY default sheet.

