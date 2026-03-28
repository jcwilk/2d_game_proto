---
id: 2gp-3xsk
status: closed
deps: []
links: []
created: 2026-03-28T16:21:08Z
type: task
priority: 2
assignee: user.email
parent: 2gp-3y3y
---
# sprite-gen: QA analyze bridge

Add **`tools/sprite-generation/qa/analyze-bridge.mjs`**: shell out to **`tools/png-analyze.mjs`** with **`--sprite-width` / `--sprite-height`** from the preset, write **sidecar JSON** next to the analyzed PNG, same behavior as **`dpad-workflow.mjs`** ~**712–741** (paths, exit handling, stdout/stderr expectations).

## Acceptance criteria

- [ ] Integration-style Vitest: **temp PNG** on disk + invoke bridge (or **mock `child_process.spawnSync`** with golden argv/assertions) — **no requirement to run real fal**.
- [ ] Test or module comment documents **repo root resolution** (how the bridge finds **`tools/png-analyze.mjs`** from `tools/sprite-generation/qa/`).
- [ ] Sidecar output path and shape match the monolith for the same inputs.

## Notes

**2026-03-28T16:33:57Z**

Added tools/sprite-generation/qa/analyze-bridge.mjs (execFileSync to tools/png-analyze.mjs, REPO_ROOT via import.meta.url). Integration test vs direct exec; spawn.test with mocked child_process for argv parity with dpad-workflow.
