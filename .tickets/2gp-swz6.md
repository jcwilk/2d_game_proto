---
id: 2gp-swz6
status: open
deps: [2gp-435f, 2gp-dcs7]
links: []
created: 2026-03-28T03:23:56Z
type: feature
priority: 0
assignee: user.email
parent: 2gp-2rau
---
# Wire main entry to start Engine and show a minimal scene

`main.ts` starts the engine and shows a placeholder `Scene`. **Normative:** **`.cursor/plans/project-implementation-deep-dive.md`** §C.2 (bootstrap before full loader work); §E.0 / §E.5.1 for secrets vs client (see Acceptance Criteria item 3).

## Design

Minimal scene only; full **Loader** / atlas integration is **Epic: Asset loading & atlas** (`2gp-hbb5`).

## Acceptance Criteria

1) `npm run dev` opens a running canvas with **no** uncaught errors. 2) `npm run build` exits 0. 3) No `FAL_KEY`, `OPENAI_API_KEY`, or other secrets appear in `src/` (placeholders for **public** env like `VITE_*` are allowed only for non-secret config).

