---
id: 2gp-3ckw
status: open
deps: [2gp-awrr, 2gp-fkh5]
links: []
created: 2026-03-28T03:23:57Z
type: chore
priority: 2
assignee: user.email
parent: 2gp-c9u6
---
# Document fal versus OpenAI roles and iteration loop in tools README

§E.0, §E.5.1 flow; observability fields. Link plan §E.

## Design

tools/README.md bullets or mermaid.

## Acceptance Criteria

1) Doc states **fal** = spritesheet/raster path; **OpenAI** = non-fal gen + vision/chat. 2) Doc states provider keys **must not** use `VITE_*` and **must not** appear in the GitHub Pages client bundle; optional: point to **`rg` over `dist/`** after `npm run build` as a smoke check once the app exists. 3) Doc lists iteration observability: wall time, token/cost line items when available, parameter deltas between fal runs (plan §E.5.1).

