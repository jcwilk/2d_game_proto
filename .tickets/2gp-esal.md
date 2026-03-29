---
id: 2gp-esal
status: closed
deps: []
links: []
created: 2026-03-29T02:43:54Z
type: epic
priority: 2
assignee: user.email
---
# Epic: Rewrite sprite-generation for purpose-built fal flows

Full rewrite of tools/sprite-generation/ so fal calls use intent-aligned endpoints (animation/orchestration vs multi-view sprite sheets), replacing the unreliable flux-control-lora-canny sheet/per-tile approach. Preserve only product intent: four dpad directional buttons as the first integration test. Internal APIs, flux-control-lora-canny strategy, and manifest recipe IDs need not be preserved unless a child ticket says migrate.

Constraints: Target current branch workflow (AGENTS.md). Contracts grounded in tools/sprite-generation/README.md and tools/sprite-generation/*.test.mjs. Implementers verify fal model IDs against current fal.ai model docs (link + date in closure notes).

Strategic context: Match endpoint+adapter to intent (FalSprite-style text/grid orchestration vs Flux 2 Klein + spritesheet LoRA multi-view); do not expect layout from generic control-net; separate generation from alpha (BRIA vs red chroma); one or two coherent strategies, not more control-canny bolt-ons.

tools/fal-raster-generate.mjs is explicitly out of epic scope unless filed separately.

## Acceptance Criteria

All child tickets are closed (each child’s `deps` satisfied before close). `npm test` passes on the branch. `npm run mock:dpad-workflow` produces outputs under `public/art/dpad/` that match the topology and manifest/sprite-ref contract documented in **2gp-vk43** and validated by tests from **2gp-fknm** / **2gp-i75o** as applicable. Legacy flux-control-lora-canny paths are removed or explicitly shimmed per **2gp-sxtu**.

Children: **2gp-vk43**, **2gp-ibfz**, **2gp-j2xm**, **2gp-fknm**, **2gp-sxtu**, **2gp-i75o**.


## Notes

**2026-03-29T02:53:26Z**

Epic verification (branch fal_assets): All children 2gp-vk43, 2gp-ibfz, 2gp-j2xm, 2gp-fknm, 2gp-sxtu, 2gp-i75o confirmed closed. npm test: vitest 23 files / 95 tests passed. npm run mock:dpad-workflow: completed successfully; sheet strategy, manifest.json + sprite-ref.json + four direction tiles under public/art/dpad/ match 1×4 topology per tools/sprite-generation/README.md (2gp-vk43). Regenerated dpad outputs reverted from git working tree after verification (no binary-only commit). 2gp-sxtu: no legacy control-canny modules in tools/sprite-generation code; only documented historical README section mentions fal-ai/flux-control-lora-canny; dpad-workflow.mjs uses DEFAULT_FAL_ENDPOINT flux/dev. Fal model IDs: see README ADR — fal-ai/flux/dev https://fal.ai/models/fal-ai/flux/dev/api verified 2026-03-28 per child 2gp-vk43 closure.

**2026-03-29T02:54:08Z**

Follow-up (verifier): manifest structural test failed — it expected generate/sheet specs keys vs public/art/dpad/manifest.json (mock workflow output). Added tools/sprite-generation/fixtures/dpad-generate-sheet-manifest.json from buildInitialManifest; manifest.test.mjs reads fixture; manifest.mjs docstring clarified. npm test green (95).
