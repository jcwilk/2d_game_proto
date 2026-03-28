---
id: 2gp-f00w
status: closed
deps: [2gp-csxt, 2gp-c7tr]
links: []
created: 2026-03-28T17:16:51Z
type: feature
priority: 1
assignee: user.email
parent: 2gp-42s3
tags: [sprite-gen, pipeline, orchestration]
---
# sprite-gen: pluggable pipeline stages; preset drives generatorConfig/postprocessSteps

## Design

`runPipeline` in `tools/sprite-generation/pipeline.mjs` already branches into helpers (`runMockSheetPath`, `runGenerateSheetPath`, etc.) but **chroma/postprocess and generator wiring** remain centralized; `generatorConfig` / `postprocessSteps` in `presets/dpad.mjs` are documented as unused. Refactor toward a **stage registry or ordered pipeline list** so postprocess and generator hooks are data-driven from the preset, not only factored functions.

## Acceptance Criteria

- **Scope pin:** Deliverable is **data-driven hooks** for generation/postprocess aligned with existing `runMock*` / `runGenerate*` strategies — not a general-purpose plugin framework. `runPipeline` exposes an explicit **stage registry or ordered pipeline list** for those steps (beyond the existing per-strategy helper split); per-tile vs sheet remain supported.
- Preset-declared `generatorConfig` and/or `postprocessSteps` are **read and applied** (or **removed** from the preset with docs updated if intentionally deferred—prefer consume or delete with rationale in a ticket note).
- No behavioral regression for d-pad mock and generate paths (existing `tools/dpad-workflow.mjs` entry points).
- Likely touch targets: `tools/sprite-generation/pipeline.mjs`, `tools/sprite-generation/presets/dpad.mjs`, `tools/sprite-generation/generators/types.mjs` if contracts change.

