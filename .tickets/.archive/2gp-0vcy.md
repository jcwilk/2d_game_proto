---
id: 2gp-0vcy
status: closed
deps: []
links: []
created: 2026-03-28T17:16:51Z
type: chore
priority: 2
assignee: user.email
parent: 2gp-42s3
tags: [sprite-gen, documentation, qa]
---
# sprite-gen: document T2I/chroma variance vs enforced grid geometry

## Design

Cross-critique: clarify the contract boundary—chroma-key + border-median heuristics and T2I variance are stochastic; grid geometry (sheet crops, tile size, QA cell grid) is deterministic. Reduces confusion for future preset authors and QA expectations.

## Acceptance Criteria

- Short doc section added in-repo (e.g. `tools/sprite-generation/README.md` or `tools/sprite-generation/presets/dpad.mjs` header) stating: what is deterministic (geometry, crop coords, tile dimensions) vs variable (model output, chroma tolerance effects).
- Links or `@see` pointers to `tools/sprite-generation/pipeline.mjs` postprocess and QA analyze path.
- No production code change required unless a comment in pipeline clarifies the same boundary inline.

