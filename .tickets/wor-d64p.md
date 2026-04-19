---
id: wor-d64p
status: closed
deps: []
links: []
created: 2026-04-19T20:34:45Z
type: epic
priority: 2
assignee: Cursor Agent
---
# Epic: Drag-to-stuck HUD ability (recharge, preset art, mouse+touch)

Add a large bottom-screen draggable icon (“stun” is informal UI copy only; **stuck** is the mechanics name): drag onto the **monster** to apply a **stuck** state that halts chase; the NPC only resumes chasing after the player **re-enters** aggro proximity (re-aggro). Ability recharges after a cooldown. While dragging, show a clear **floating/ghost** affordance; on release **not** over a valid target, **cancel with no effect**. Ship a new sprite-generation preset producing a **4-frame** strip (frame0 = idle HUD; frames 1–3 = activation on drop). Support pointer + touch for web mobile.

Implementation should align with existing patterns: constants in **`src/game/npcCombat.ts`** (`MONSTER_AGGRO_RADIUS_WORLD_PX`, `ENEMY_CHASE_SPEED_WORLD_PX`, etc.) and monster chase / `monsterAggro` in **`src/main.ts`**, DOM overlays for chrome (see **`specs/viewport-square-dpad-chrome.md`** input split), and **`tools/sprite-generation`** preset modules under **`presets/<slug>/`**. Exact handling of **`monsterAggro` vs chase permission** after unstuck is **normative in the slice spec** (child ticket **wor-98q7**), not left implicit.
