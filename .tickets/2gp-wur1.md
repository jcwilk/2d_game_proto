---
id: 2gp-wur1
status: open
deps: [2gp-ggcc]
links: []
created: 2026-03-29T17:54:41Z
type: task
priority: 1
assignee: user.email
parent: 2gp-sni8
---
# presets/registry.mjs and resolveRepoRoot

Add `tools/sprite-generation/presets/registry.mjs` exporting `resolveRepoRoot()` (walk upward from `import.meta.url` until `package.json` is found; do not rely on cwd alone) and a frozen `PRESETS: Record<assetId, RegistryEntry>` with: `manifestPresetId`, `presetModuleHref` (absolute `file:` URL via `pathToFileURL` for dynamic `import()`), `defaultOutBase` (absolute, derived from repo root), `publicArtDir`, `manifestRelative`, `sheetBasename`, `defaultStrategy`. Optional: assert invariants (e.g. href reachable, keys match `ASSET_ID`) when `SPRITESHEET_REGISTRY_STRICT=1` or `NODE_ENV=test`.

## Design

- Registry keys: `dpad`, `character` (CLI / folder `assetId`).
- Field `manifestPresetId` is the manifest `preset` string; do not conflate with `PipelinePreset.presetId` in docs or field names.

## Acceptance Criteria

- Unit or smoke test loads `PRESETS`, calls `resolveRepoRoot()`, and asserts each `presetModuleHref` is an absolute `file:` URL under the resolved repo root.
- `import(presetModuleHref)` (or equivalent) succeeds for both presets in CI.
- Optional strict mode: when enabled, invalid entries fail fast with a clear error.

