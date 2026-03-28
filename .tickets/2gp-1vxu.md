---
id: 2gp-1vxu
status: open
deps: [2gp-swz6, 2gp-xjhm, 2gp-x4js, 2gp-569r, 2gp-9qeh]
links: []
created: 2026-03-28T03:23:56Z
type: feature
priority: 0
assignee: user.email
parent: 2gp-hbb5
---
# Integrate Loader and render at least one Sprite in the main scene

End-to-end Loader → Sprite in scene; verify VITE_BASE build. Plan §C.2, §A.2.1.

## Design

Placeholder in public/; build with VITE_BASE like CI.

## Acceptance Criteria

1) Running game shows at least one static sprite loaded via Loader. 2) **`VITE_BASE` / `dist/` URL correctness** is **already owned by** tickets **Configure Vite base and VITE_BASE** (`2gp-569r`) and **Pass VITE_BASE from GitHub Actions** (`2gp-9qeh`)—this ticket additionally requires: `npm run build` with `VITE_BASE=/<repo>/` succeeds, and **`dist/`** contains no literal substrings **`FAL_KEY`** or **`OPENAI_API_KEY`** (verify with e.g. `rg FAL_KEY dist/` and `rg OPENAI_API_KEY dist/` both returning no matches). 3) Closure notes state whether sprite loading required any path fixes beyond sibling tickets.

