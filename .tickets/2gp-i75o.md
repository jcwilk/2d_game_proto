---
id: 2gp-i75o
status: open
deps: [2gp-sxtu]
links: []
created: 2026-03-29T02:44:04Z
type: task
priority: 3
assignee: user.email
parent: 2gp-esal
---
# Sprite-gen: dpad harness and documentation

Ensure npm run mock:dpad-workflow is documented for the four-direction layout under public/art/dpad/. Document limitations of live generation. Confirm tools/sprite-generation/qa/analyze-bridge.integration.test.mjs and analyze-bridge.spawn.test.mjs pass with npm test, or document required changes in closure with rationale.

## Design

Cross-link tools/sprite-generation/README.md to preset contract, pipeline, QA bridge. npm run mock:dpad-workflow is the primary local harness; document --mode generate and FAL_KEY for optional live runs.

## Acceptance Criteria

**tools/sprite-generation/README.md** updated with cross-links to preset contract, pipeline entry points, and QA bridge (not closure-only unless README is impossible to edit—in that case closure explains why). Document `npm run mock:dpad-workflow`, `--mode generate`, and `FAL_KEY` for optional live runs. npm test passes including `tools/sprite-generation/qa/analyze-bridge.integration.test.mjs` and `analyze-bridge.spawn.test.mjs`, or closure note explains N/A with concrete reason. README does not present `flux-control-lora-canny` as the primary or recommended dpad generation path (mention only in historical/deprecated context if needed).

