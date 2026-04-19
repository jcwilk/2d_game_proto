---
id: 2gp-hrpb
status: open
deps: [2gp-9ykt]
links: []
created: 2026-04-19T03:02:23Z
type: feature
priority: 1
assignee: user.email
parent: 2gp-czux
---
# Sprite-generation presets and registry → TypeScript

Convert **tools/sprite-generation/presets/** and **presets/registry.mjs** (+ **registry.test.mjs**) to **.ts**. Must complete before **`2gp-e5lc` (C8)** because **generate-spritesheet** and **dpad-workflow** import registry/presets. Internal preset provenance / path strings that still cite **.mjs** modules should be updated here when they refer to migrated preset files; broad CLI/help/docs sweeps remain **`2gp-e5lc`** / **`2gp-nxd2`**.

## Acceptance Criteria

**presets/** and **registry** are **.ts**; **npm test** passes for **registry.test**, **presets/dpad/dpad.test**, **presets/dpad/dpad-distinguishability.test**, **presets/avatar-character/avatar-character.test**, and any other preset tests under **tools/sprite-generation/presets/** (modules without tests noted in verifier notes).

