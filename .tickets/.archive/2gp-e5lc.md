---
id: 2gp-e5lc
status: closed
deps: [2gp-hrpb]
links: []
created: 2026-04-19T03:02:23Z
type: feature
priority: 1
assignee: user.email
parent: 2gp-czux
---
# Top-level sprite CLIs → TypeScript (generate-spritesheet, dpad workflows)

Convert **tools/generate-spritesheet.mjs**, **tools/dpad-workflow.mjs**, **tools/mock-dpad-workflow.mjs**, **tools/generate-spritesheet.test.mjs** to **.ts**. Update **mock-dpad-workflow** spawn target to invoke **dpad-workflow** via the **`2gp-gwjc`** runner (not a hardcoded sibling **.mjs**). Update user-visible strings/constants (**PROVENANCE_TOOL**, help text, fixtures such as **manifest** tests / **public** manifests if they embed tool paths) so they match the post-migration entrypoints. **package.json** scripts must not call removed **.mjs** paths.

**Prerequisite:** **`2gp-gwjc`** is satisfied transitively through the conversion chain; follow the documented runner/argv pattern from that ticket.

## Acceptance Criteria

CLIs run as **.ts**; **mock-dpad-workflow** spawn argv matches **`2gp-gwjc`**; **rg** shows no stale **tools/\*.mjs** paths in these CLIs’ user-facing strings; **generate-spritesheet** tests pass under **npm test**.

