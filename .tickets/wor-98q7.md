---
id: wor-98q7
status: closed
deps: []
links: []
created: 2026-04-19T20:34:59Z
type: feature
priority: 1
assignee: Cursor Agent
parent: wor-d64p
---
# Spec: drag-to-stuck HUD (stuck, recharge, re-aggro)

Add authoritative markdown under **`specs/`** (new slice file, e.g. **`specs/drag-stun-hud.md`** — filename may keep “stun” for continuity; body should use **stuck** for mechanics) with at least these **normative** sections:

1. **Behavior & targeting** — Large draggable control anchored toward the **bottom** of the viewport; grab anywhere on the affordance. **Valid targets: monster only** (align with **wor-39p4**); merchant / peaceful NPCs are out of scope unless a later epic expands scope.

2. **Stuck** — On successful drop: monster becomes **stuck** (zero chase velocity; chase step skipped). Define whether **melee** while stuck is allowed or suppressed (must reconcile with current `src/main.ts` loop where melee shares the `monsterAggro` block).

3. **Unstuck / duration** — Define stuck duration (timed constant) or rule for ending stuck; cite tunable constants in one place (e.g. alongside **`npcCombat.ts`** exports).

4. **Re-aggro / state machine** — Normatively reconcile **today’s** behavior ( **`monsterAggro`** flips true on first entry into `MONSTER_AGGRO_RADIUS_WORLD_PX` and stays true) with the new rule: **after stuck ends, chase must not resume until the player is again within `MONSTER_AGGRO_RADIUS_WORLD_PX`** (same distance semantics as initial aggro). Specify whether **`monsterAggro` is cleared** when stuck applies/ends vs a separate **“chase armed”** gate so re-entry is detectable—no hand-waving.

5. **Hit-testing** — Pick **one** normative approach consistent with **wor-0814** / **wor-39p4**: e.g. release **`clientX/Y` → logical/world coords** (canvas `getBoundingClientRect` + `VIEWPORT_SIZE`) then **`worldPointInNpcBounds`** for the monster; document range rules (e.g. same as **`playerCanAttackNpc`** or sprite hit only).

6. **Cooldown** — Ability recharge; single tunable constant; UI disabled/depleted while recharging.

7. **Layout vs chrome** — How the orb coexists with **`specs/viewport-square-dpad-chrome.md`** (south strip / grid, z-index, no accidental overlap with d-pad hit targets).

8. **Input** — Pointer events for overlay (**DOM path**); `preventDefault` / scroll where needed; optional note on single active drag vs d-pad (**Map/pointer id** pattern from viewport spec).

9. **Assets** — If the HUD uses **`<img>`** / DOM images, follow viewport spec **`import.meta.env.BASE_URL`** rules for public URLs.

10. **Animation** — **4-frame** strip: frame **0** = HUD idle; frames **1–3** = activation on **successful** drop (not on miss/cooldown). During drag, HUD shows frame **0** (ghost). **Stable frame keys** must match **`sprite-ref.json` / manifest** from preset **wor-8vq0** (cross-link preset id or ticket).

## Design

Reference **`src/main.ts`** monster chase loop and **`src/game/npcCombat.ts`**. Cross-link **wor-8vq0** (sprite preset).

## Acceptance Criteria

- New **`specs/*.md`** file exists with the sections above filled in.
- Re-aggro / `monsterAggro` behavior is **fully specified** (implementable state machine), not contradictory to **`npcCombat.ts`** constants.
- No contradiction with **`specs/viewport-square-dpad-chrome.md`** on DOM vs canvas input and asset URL rules.
- Animation section ties to **stable sprite-ref frame ids** from **wor-8vq0**.
