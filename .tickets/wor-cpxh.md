---
id: wor-cpxh
status: open
deps: [wor-0814]
links: []
created: 2026-04-19T20:34:59Z
type: task
priority: 3
assignee: Cursor Agent
parent: wor-d64p
---
# Tests + verifier evidence for drag-to-stuck feature

Add/extend **Vitest** coverage aligned with **`specs/drag-stun-hud.md`**: cooldown gating, re-aggro distance / state, stuck → zero chase velocity, and API return branches. Reuse **`src/game/npcCombat.test.ts`** patterns for bounds where applicable. Optional thin DOM tests (**`pointer.test.ts`** / **`screenOverlay.test.ts`** style) only if valuable.

Document **manual QA** for touch (steps in **ticket closure note** or **`specs/`** cross-link — avoid random README churn unless needed). Run **`npm test`** (**full** repo suite: includes `src/**` and `tools/**` per **`package.json`**) before close; fix unrelated failures only if introduced by this work.

**Verifier:** Run **verifier** subagent per **`.cursor/agents/verifier.md`** before persist; leave evidence in closure note (e.g. green **`npm test`**, manual touch checklist done).

## Acceptance Criteria

- **`npm test`** passes.
- New tests cover **named** behaviors: cooldown blocks activation; while stuck, chase velocity zero; after unstuck, chase resumes only per **re-aggro** rules in spec (not legacy sticky-aggro-only behavior).
- No regressions in **existing** tests (e.g. **`src/game/npcCombat.test.ts`** and other pre-existing suites).
- Manual touch QA steps recorded for verifier.
