---
id: 2gp-dcs7
status: open
deps: [2gp-435f]
links: []
created: 2026-03-28T03:23:56Z
type: task
priority: 1
assignee: user.email
parent: 2gp-2rau
---
# Add global styles for canvas touch-action and pointer behavior

Canvas container touch-action: none. Plan §D.2.

## Design

CSS imported from `main.ts` (e.g. `src/styles.css`). Apply rules to a **named** wrapper (e.g. `#game-root` or `.game-shell`) that parents the canvas—document the selector in this ticket’s closure notes.

## Acceptance Criteria

1) Built app has `touch-action: none` on the documented game container selector. 2) Comment cites §D.2.

