---
id: wor-cpxh
status: closed
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

## Notes

**2026-04-19T20:59:05Z**

Implementation: Extended src/game/stuckAbility.test.ts with spec-aligned Vitest cases — §2 chase gating (stuck vs no-aggro), §4 re-aggro (strict outside at aggroR2 boundary, timeline inside disk while armed), §6 cooldown branch, tryApply branches ok/defeated/invalid_target/miss (bounds + range). npm test: green (full vitest run).

Manual touch QA (verifier): 1) Open game on touch device or devtools mobile emulation. 2) Drag stuck orb from bottom HUD; confirm pointer capture — release tracks even if finger moves off orb. 3) Drop on monster within melee range — monster stops chasing (no approach) and does not melee player for stuck duration; orb shows activation frames only on ok. 4) After stuck ends, stand inside aggro radius — monster does NOT chase until you walk out past aggro edge then re-enter. 5) Successful apply — orb disabled/depleted until cooldown elapses; misses do not start cooldown. 6) Drop on merchant — no stuck, invalid behavior. Cross-ref: specs/drag-stun-hud.md.
