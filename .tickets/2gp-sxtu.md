---
id: 2gp-sxtu
status: closed
deps: [2gp-fknm]
links: []
created: 2026-03-29T02:44:03Z
type: chore
priority: 3
assignee: user.email
parent: 2gp-esal
---
# Sprite-gen: remove legacy control-canny paths

Delete or quarantine control-canny-specific modules and CLI surface after new paths and manifests are in place. Verify no stale user-facing strings for control-canny in the dpad workflow CLI.

## Design

Remove tools/sprite-generation/control-image.mjs and tests, probe-fal-control-canny-sizes.mjs, docs/fal-control-canny-image-size.md when obsolete. Update tools/dpad-workflow.mjs help and flags. Strip DEFAULT_FAL_CONTROL_* from presets/dpad.mjs unless a documented deprecation shim remains.

## Acceptance Criteria

rg -n 'flux-control-lora-canny|control-canny' tools/sprite-generation tools/dpad-workflow.mjs returns no matches, OR only matches a documented deprecation shim with README pointer. npm test passes. tools/dpad-workflow.mjs --help contains no misleading legacy control-canny-only language (update help text as needed).

