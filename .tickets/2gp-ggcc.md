---
id: 2gp-ggcc
status: closed
deps: []
links: []
created: 2026-03-29T17:54:41Z
type: task
priority: 1
assignee: user.email
parent: 2gp-sni8
---
# Preset layout, module contract, and PipelinePreset JSDoc

Reorganize tools/sprite-generation/presets/character.mjs and dpad.mjs into presets/character/character.mjs and presets/dpad/dpad.mjs (tests co-located). Add tools/sprite-generation/preset-contract.mjs with JSDoc SpritePresetModule / CreatePresetOptsBase. Each preset module must export: ASSET_ID, MANIFEST_PRESET_ID, KIND, createPreset(opts), recipeId(mode, strategy?) using pipeline vocabulary mock|generate only. No default export. createPreset must set preset.presetId === MANIFEST_PRESET_ID. Update provenance paths. Unify or alias legacy CHARACTER_PRESET_ID/DPAD_PRESET_ID exports to avoid drift. Align pipeline.mjs JSDoc for PipelinePreset.prompt with actual resolveSheetPromptText / sheetPromptBuilder usage.

## Design

Layout: presets/<assetId>/<assetId>.mjs. recipeId delegates to buildRecipeId; strategy policy matches manifest.mjs and runPipeline defaults.

## Acceptance Criteria

- `npm test` passes.
- All imports and provenance strings updated (workflows, pipeline tests, manifest tests, mock tests, README comments, `src` references as needed).
- `grep`/search shows no stale paths to `presets/character.mjs` or `presets/dpad.mjs` at old locations (only `presets/<assetId>/<assetId>.mjs`).
- `preset-contract.mjs` documents `SpritePresetModule` / `CreatePresetOptsBase`; both preset modules export the required symbols and have no default export.
- `pipeline.mjs` JSDoc for `PipelinePreset.prompt` matches `resolveSheetPromptText` / `sheetPromptBuilder` behavior.

