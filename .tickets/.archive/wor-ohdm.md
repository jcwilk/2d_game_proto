---
id: wor-ohdm
status: closed
deps: [wor-c34h, wor-p7oe, wor-mwhk]
links: []
created: 2026-04-19T16:37:45Z
type: chore
priority: 3
assignee: Cursor Agent
parent: wor-isz6
---
# docs: sprite-gen README — mock vs fal vs sprite-ref, fork character preset

## Design

Optional plan todo: one section in tools/sprite-generation/README.md describing layering and how to fork a character preset for a new slug (merchant-style).

## Acceptance Criteria

README section exists; links to preset-contract and presets/lib; no duplicate presets/lib/README unless justified.


## Notes

**2026-04-19T17:19:50Z**

README: new section 'Mock vs live (fal) vs sprite-ref' links preset-contract.ts, pipeline PipelinePreset, generators mock/fal, sprite-ref writeSpriteRef; character lib pointers to presets/lib (character-defaults, character-preset). Forking steps mirror merchant-character (copy slug dir, ASSET_ID=dir, MANIFEST_PRESET_ID/KIND unique, artUrlPrefix, auto registry). Vitest: presets/registry.test.ts passed.
