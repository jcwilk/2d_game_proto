---
id: 2gp-h68c
status: closed
deps: []
links: []
created: 2026-03-28T16:21:05Z
type: task
priority: 2
assignee: user.email
parent: 2gp-3y3y
---
# sprite-gen: prompt builder

Add **`tools/sprite-generation/prompt.mjs`**: generalize **`dpad-workflow.mjs`** ~**375–412** into **`buildPrompt({ tileSize, chromaKeyHex, style, composition, subject })`** (and sheet variant **`buildSheetPrompt`** / equivalent) so **style**, **composition**, and **subject** can change without editing frame lists.

Preserve **semantic parity** with current dpad prompts (chroma background, prohibitions, per-direction subject text, sheet layout wording).

## Acceptance criteria

- [x] Vitest string assertions: outputs **contain** expected fragments for given **style/composition/subject** fixtures (chroma hex, “no gradient”-class rules, frame variant text).
- [x] **Sheet** prompt text matches the monolith’s **SHEET** layout description for the same inputs.
- [x] **No API calls** — prompt functions are pure strings.
