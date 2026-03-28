---
id: 2gp-kz6m
status: open
deps: [2gp-435f, 2gp-1voe]
links: []
created: 2026-03-28T03:23:57Z
type: feature
priority: 1
assignee: user.email
parent: 2gp-2rau
---
# Implement pointer-based input facade for Excalibur

Excalibur pointer APIs for mouse + touch; suppress browser scroll/zoom where needed. **Normative:** **`.cursor/plans/project-implementation-deep-dive.md`** §D.2.

## Design

Prefer `src/input/pointer.ts` (closure notes if different). Use **Excalibur ^0.32** pointer APIs—confirm symbol names against current docs (**web-research** if names are uncertain). Invoke **`preventDefault`** (or the engine-supported equivalent) where §D.2 says the browser would otherwise scroll/zoom instead of feeding the game.

## Acceptance Criteria

1) One module owns pointer subscription lifecycle (subscribe/unsubscribe or engine-scoped pattern—document which). 2) No `any` in the new code. 3) Colocated `*.test.ts` covers **either** handler registration wiring **or** a **pure** helper extracted from the facade (e.g. event → intent reducer). 4) Module or call-site comment explains how scroll/zoom is suppressed for pointer targets, with a real call site **or** an explicit note that Excalibur fully handles it—cite §D.2.

