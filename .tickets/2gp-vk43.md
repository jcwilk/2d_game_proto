---
id: 2gp-vk43
status: open
deps: []
links: []
created: 2026-03-29T02:43:56Z
type: task
priority: 1
assignee: user.email
parent: 2gp-esal
---
# Sprite-gen: strategy, topology, and fal ID verification

Add or update documentation under tools/sprite-generation/README.md (or a single sibling .md in that folder if necessary) that records: (a) chosen 1–2 strategies and explicit out-of-scope items (e.g. full FalSprite parity); (b) runtime topology contract—whether the game keeps 1×4 sheet + four frameKeyRect PNGs under public/art/dpad/ or adopts 2×2 Klein fal output with a defined crop/stitch or manifest change; (c) a named preset or pipeline field for alpha path (chroma vs BRIA) so postprocess work is testable; (d) verified fal endpoint id(s) with fal.ai doc URL and verification date in the doc and in ticket closure notes.

## Design

FalSprite (nano-banana + OpenRouter via fal + BRIA + grids) vs Flux 2 Klein + spritesheet LoRA are reference strategies—pick 1–2 for this repo and document tradeoffs. Production dpad today uses a 1×4 horizontal sheet and four frameKeyRect URLs (see tools/sprite-generation/presets/dpad.mjs). If Klein 2×2 fal output is chosen, document how it maps to four directional tiles (crop/stitch) or what manifest/game changes follow. resolveGeneratorConfig lives in pipeline-stages.mjs (used by pipeline.mjs).

For **alpha path**: today only `chromaKey` is registered in `POSTPROCESS_REGISTRY`—document that and either treat **BRIA** (or similar) as future/out-of-scope with a named placeholder field, or scope a follow-up ticket if a second step id is added.

Reconcile **tools/README.md** with this README if the top-level tools doc still describes sheet topology (e.g. 512² / 2×2) that conflicts with the dpad 1×4 contract—update the paragraph or add a prominent cross-link to the canonical section here.

## Acceptance Criteria

README (or agreed doc path under tools/sprite-generation/) merged on current branch. Document states strategy choice, topology/game contract, alpha config surface (including how it maps to `postprocessSteps` / preset fields today), and at least one fal endpoint id per chosen path with fal.ai doc URL and **verification date** (ISO). **tools/README.md** does not contradict the canonical dpad/sheet topology documented here (edit or cross-link). Blocks implementation children until closed. Evidence: `./tk show` closure note lists doc paths + fal URLs and verification dates used.

