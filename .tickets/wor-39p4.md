---
id: wor-39p4
status: closed
deps: [wor-98q7]
links: []
created: 2026-04-19T20:34:59Z
type: feature
priority: 1
assignee: Cursor Agent
parent: wor-d64p
---
# Game logic: stuck state, cooldown, re-aggro gate for monster chase

Implement state in **`src/main.ts`** or an extracted module per **`specs/drag-stun-hud.md`** (once **wor-98q7** lands): ability **cooldown**, **monster stuck** (flag and/or duration), and chase gating so that while stuck **`monsterNpc.vel = vec(0, 0)`** and chase is skipped; **melee-while-stuck** follows the spec (do not guess—spec resolves vs current single `monsterAggro` block).

**Re-aggro:** After unstuck, chase must **not** resume until the player **re-enters** **`MONSTER_AGGRO_RADIUS_WORLD_PX`** (implement the state machine described in the spec—may require clearing **`monsterAggro`** or a separate latch; **wor-98q7** is canonical).

**Constants:** Add e.g. **`STUCK_ABILITY_COOLDOWN_MS`** / **`MONSTER_STUCK_DURATION_MS`** (names illustrative) **next to** existing combat tuning in **`src/game/npcCombat.ts`** (or one linked module) so HUD and logic stay aligned.

**API for UI (minimal):** e.g. **`isAbilityReady()`**, **`getCooldownRemainingMs()`** (optional), **`tryApplyStuckAtWorldCoords(x, y)`** (or hit-test helper) returning a **discriminated result** such as **`'ok' | 'miss' | 'cooldown' | 'invalid_target' | 'defeated'`** so **wor-0814** can animate or no-op without guessing. **Monster-only:** refuse merchant / non-monster even if coords hit.

## Design

Reuse **`worldPointInNpcBounds`** / **`distanceSquared`**; hit-test range rules **as specified** (may or may not require **`playerCanAttackNpc`**—follow spec).

## Acceptance Criteria

- With HUD **stubbed or disabled**, **Vitest** coverage for **pure** helpers / state: while stuck, monster **velocity stays zero** for chase; **cooldown** blocks repeat apply; after unstuck, **chase does not resume** until player distance ≤ aggro radius again per spec.
- **Scope:** Land **minimal** logic tests here; **wor-cpxh** adds integration polish, manual QA checklist, and verifier evidence—avoid leaving all tests only for the last ticket if core logic is extractable now.
