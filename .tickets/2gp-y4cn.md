---
id: 2gp-y4cn
status: open
deps: [2gp-veak, 2gp-1os4, 2gp-47nd, 2gp-myah, 2gp-bdeg, 2gp-9ykt, 2gp-hrpb, 2gp-e5lc]
links: []
created: 2026-04-19T03:02:23Z
type: chore
priority: 2
assignee: user.email
parent: 2gp-czux
---
# Stitch: reconcile gameDimensions, tsconfig graph, Vitest globs, tools↔src imports

After all conversion tickets close—**A1** `2gp-veak`, **A2** `2gp-1os4`, **A3** `2gp-47nd`, **A4** `2gp-myah`, **B5** `2gp-bdeg`, **B6** `2gp-9ykt`, **C7** `2gp-hrpb`, **C8** `2gp-e5lc`:

- **gameDimensions / src/dimensions:** one canonical module (or re-export) for layout constants; eliminate duplicate conflicting literals between **tools/** and **src/**.
- **tsconfig:** resolve **src/dimensions.sync.test.ts** / related excludes so the graph is coherent without permanent workarounds when possible.
- **Vitest:** **`2gp-gwjc`** added **tools/\*\*/\*.test.ts**; this ticket **removes** **tools/\*\*/\*.test.mjs** from **include** only when zero such tests remain.
- **moduleResolution / paths:** Vite app + Node tools still typecheck and run without drift.

## Acceptance Criteria

**npm run typecheck** and **npm test** green; **vitest.config.ts** **include** lists only extensions that exist (no dead **.mjs** glob); dimensions constants have a single authoritative definition verifiable by inspection (and **rg** for duplicate magic numbers if needed—document method in notes).

