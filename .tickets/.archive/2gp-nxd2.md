---
id: 2gp-nxd2
status: closed
deps: [2gp-y4cn]
links: []
created: 2026-04-19T03:02:23Z
type: chore
priority: 2
assignee: user.email
parent: 2gp-czux
---
# Stitch: docs, skills, and *.mjs path string sweep

Update **tools/README.md**, **tools/sprite-generation/README.md**, **.cursor/skills/generate-spritesheet/SKILL.md**, and other **first-party** prose that references old **tools/\*.mjs** entrypoints or **`node tools/...mjs`** copy-paste examples. **Out of scope:** vendored upstream snippets and **scripts/ticket** (third-party). **S1** here means **`2gp-y4cn`**—align examples with the reconciled layout and the runner from **`2gp-gwjc`**.

## Acceptance Criteria

Docs/skills show the current **.ts** entrypoints and the documented runner; **`rg '\.mjs'`** on listed doc paths has no misleading examples for tools migrated in this epic (historical notes may remain if clearly labeled—call out in verifier notes).

