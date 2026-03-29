---
id: 2gp-j2xm
status: closed
deps: [2gp-ibfz]
links: []
created: 2026-03-29T02:44:00Z
type: task
priority: 2
assignee: user.email
parent: 2gp-esal
---
# Sprite-gen: postprocess and alpha alignment

Update pipeline-stages.mjs and related postprocess so defaults match the chosen alpha path. Document dpad postprocessSteps default and determinism vs variance in README.

## Design

**2gp-ibfz** lands first and freezes fal/generator wiring; this ticket owns **applyPostprocessPipeline** / **POSTPROCESS_REGISTRY** defaults and README postprocess/determinism rows. Align with the alpha strategy from **2gp-vk43** (red chroma vs BRIA or other—if BRIA is still future-only, document that and keep a single coherent default). Preserve README distinction between deterministic geometry and stochastic T2I/chroma per tools/sprite-generation/README.md table.

## Acceptance Criteria

npm test passes. tools/sprite-generation/postprocess/chroma-key.test.mjs and tools/sprite-generation/pipeline-stages.test.mjs updated for new defaults and pass. README table reflects the new postprocess story.

