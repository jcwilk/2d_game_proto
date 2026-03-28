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

Excalibur pointer APIs for mouse+touch; preventDefault where needed. Plan §D.2.

## Design

`src/input/pointer.ts`; typed handlers; use Excalibur 0.32 pointer APIs (confirm names against current docs—spawn **web-research** if API names are uncertain). Call **`preventDefault`** (or Excalibur-supported equivalent) where default browser behavior would scroll or zoom the page instead of delivering input to the canvas (plan §D.2). Vitest minimal check required.

## Acceptance Criteria

1) Single module owns subscription lifecycle (subscribe/unsubscribe or engine-scoped pattern). 2) No `any`. 3) `*.test.ts` exercises the facade API (registration or pure reducer). 4) Code or module comment states how scroll/zoom is suppressed for pointer targets (§D.2), with at least one call site or documented no-op if Excalibur handles it entirely.

