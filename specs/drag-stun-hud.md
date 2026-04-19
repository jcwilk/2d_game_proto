# Drag-to-stuck HUD (stuck, recharge, re-aggro)

**Status:** normative (implementation: **wor-0814**, game logic: **wor-39p4**, art preset: **wor-8vq0**)  
**Terminology:** This document uses **stuck** for the monster incapacitation mechanic. The filename keeps **stun** for continuity with existing ticket references.

## Normative references

| Source | Role |
|--------|------|
| `specs/viewport-square-dpad-chrome.md` | DOM overlay, `BASE_URL`, pointer/`Map` pattern, grid layout |
| `src/game/npcCombat.ts` | Combat tuning exports (`MONSTER_AGGRO_RADIUS_WORLD_PX`, bounds helpers, ranges) |
| `src/main.ts` | Today’s monster loop: `monsterAggro` latch + shared chase/melee block |
| Ticket **wor-8vq0** | 4-frame HUD sheet, `sprite-ref.json` stable frame ids (`MANIFEST_PRESET_ID` e.g. `hud_drag_orb`) |

**Reconciliation with viewport spec:** HUD input uses the **same DOM-native overlay path** as d-pad chrome (see viewport spec §2, §6). Asset URLs for `<img>` / CSS images **must** use **`import.meta.env.BASE_URL`** (viewport spec §5.2). **`touch-action: none`** on `#game-root` remains the primary scroll guard; add **`preventDefault`** on the orb only if a platform still scrolls during drag.

---

## 1. Behavior & targeting

- **Control:** A **large**, **draggable** HUD affordance anchored toward the **bottom** of the **viewport** (logical playfield + chrome layout), not necessarily inside the square canvas cell only—implementations may place it in an outer grid cell (viewport spec §5.1) so it stays reachable on touch devices.
- **Grab:** Pointer down **anywhere** on the affordance starts a drag; the element should use **pointer capture** where needed so release is tracked reliably.
- **Valid targets: monster only.** A successful ability applies only to the **monster** NPC. **Merchants** and other **peaceful** NPCs are **out of scope** for this ability unless a later epic expands scope. Hit-test logic **must** resolve a target kind (e.g. monster vs merchant) and **refuse** non-monster targets with a discriminated result (see **wor-39p4**), even if geometry hits.

---

## 2. Stuck

- **On successful drop** on the monster (see §5), the monster enters **stuck**: it **does not chase** (no velocity toward the player from the chase step).
- **Normative — chase:** While stuck, **`monsterNpc.vel`** from chase logic is **`vec(0, 0)`**; the chase step is **skipped** (no direction-to-player acceleration).
- **Normative — melee:** Today’s code runs **enemy melee** inside the same `if (monsterAggro)` block as chase (`src/main.ts`). For a coherent “stuck” read, **enemy melee on the player from the monster must not run while the monster is stuck**—stuck suspends **both** chase movement **and** melee ticks from that block. Implement **one** predicate (e.g. `if (monsterAggro && !monsterStuck) { … chase + melee … }`) or equivalent so behavior stays consistent when the loop is refactored.

---

## 3. Unstuck / duration

- **Duration:** Stuck lasts a **fixed wall-clock** duration **`MONSTER_STUCK_DURATION_MS`** (single tunable constant).
- **Export location:** Define **`MONSTER_STUCK_DURATION_MS`** next to the other combat tuning exports in **`src/game/npcCombat.ts`** (same module as **`MONSTER_AGGRO_RADIUS_WORLD_PX`**, **`ENEMY_MELEE_RANGE_WORLD_PX`**, etc.) so HUD and simulation share one source of truth.
- **End of stuck:** When the timer elapses, **`monsterStuck`** becomes false; chase/melee for the monster are again governed by **`monsterAggro`**, **§4** re-aggro gating, and distance checks—not by the stuck timer.

---

## 4. Re-aggro / state machine

**Today (`src/main.ts`):** `monsterAggro` is set **`true`** the first time player–monster feet distance satisfies `distSqM <= MONSTER_AGGRO_RADIUS_WORLD_PX²` and is **never cleared**; while `monsterAggro`, chase and melee run (subject to range).

**New normative rule:** After stuck **ends**, the monster **must not** resume chase until the player is **again** eligible under the **same distance semantics** as **initial** aggro—i.e. feet-to-feet distance **`<= MONSTER_AGGRO_RADIUS_WORLD_PX`**—but only **after** the player has **left** the aggro disk **at least once** following the unstuck event (strict **re-entry**). Standing inside the disk the moment stuck ends **does not** immediately restore chase.

**Normative variables (implementable):**

- **`monsterAggro`** (boolean): Allows chase/melee **when true** and **not stuck** and **not defeated**, subject to §2–3.
- **`reAggroArmRequired`** (boolean): **Set `true`** when stuck is **successfully applied** (on ability `'ok'`). While **`reAggroArmRequired`** is **true**, **do not** transition `monsterAggro` from `false` to `true` **only** because the player is inside the aggro radius.
- **Priming:** While **`reAggroArmRequired`** is true, when **`distSqM > MONSTER_AGGRO_RADIUS_WORLD_PX²`** (player **strictly outside** the aggro disk), set **`reAggroArmRequired = false`** (“armed” for re-aggro).
- **Re-acquisition:** After **`reAggroArmRequired`** is false, use the **same** predicate as initial aggro: **`!monsterAggro && distSqM <= aggroR2` → `monsterAggro = true`** (with **`aggroR2 = MONSTER_AGGRO_RADIUS_WORLD_PX²`** as today).

**On successful stuck apply:** Set **`monsterAggro = false`**, **`monsterStuck = true`**, start **`MONSTER_STUCK_DURATION_MS`**, and **`reAggroArmRequired = true`**. (Clearing **`monsterAggro`** avoids relying on a duplicate “chase armed” flag for the common case and pairs cleanly with the re-entry gate.)

**Initial state:** **`reAggroArmRequired = false`** so the first approach behaves like today’s **single** `monsterAggro` latch.

**Note:** Exclamation / UI that key off proximity may use separate reads; this section **only** normatively defines **chase + melee** gating vs **`MONSTER_AGGRO_RADIUS_WORLD_PX`**.

---

## 5. Hit-testing

**Normative path (DOM HUD, align with **wor-0814** / **wor-39p4**):**

1. On **drop** (e.g. **`pointerup`** on the HUD; **`pointercancel`** treats as **miss**), read **`clientX` / `clientY`** from the pointer event.
2. Map to **logical/world** coordinates using the **game canvas** element: **`getBoundingClientRect()`** and **`VIEWPORT_SIZE`** from `src/engine.ts`—**same** mapping as other overlays that convert screen space to world space (linear scale: `worldX = (clientX - left) / rect.width * VIEWPORT_SIZE`, `worldY = (clientY - top) / rect.height * VIEWPORT_SIZE`).
3. **Monster pick:** **`worldPointInNpcBounds(worldX, worldY, monsterNpc, graphicWidth, graphicHeight, scaleX, scaleY)`** from **`src/game/npcCombat.ts`**, using the **idle** graphic dimensions and current **`Math.abs(scale.x/y)`** consistent with **`src/main.ts`**.
4. **Range (normative choice):** The drop is valid **only if** **`playerCanAttackNpc(playerFeetX, playerFeetY, monsterFeetX, monsterFeetY, NPC_ATTACK_RANGE_WORLD_PX)`** is **true**—same feet-to-feet range rule as player melee targeting in **`src/main.ts`**, so orb targeting stays consistent with existing combat reach.

**Invalid / non-monster:** Merchants and defeated monster **must** yield **`invalid_target`**, **`defeated`**, or **`miss`** per **wor-39p4**; do not apply stuck.

---

## 6. Cooldown

- **Single** tunable constant **`STUCK_ABILITY_COOLDOWN_MS`**, exported from **`src/game/npcCombat.ts`** next to other combat tuning.
- **Behavior:** After a **successful** stuck application (`'ok'`), the ability **cannot** be used again until **`STUCK_ABILITY_COOLDOWN_MS`** has elapsed (wall clock).
- **UI:** While cooling down, the HUD is **depleted / disabled** (no new drag-to-apply; optional visual timer is implementation detail). Misses and invalid targets **do not** consume cooldown unless explicitly changed in a future ticket (normative default: **only `'ok'`** starts cooldown).

---

## 7. Layout vs chrome

- **Coexistence** with **`specs/viewport-square-dpad-chrome.md`:** The orb is **DOM**-based like d-pad cells. Prefer placement in a **non-conflicting** grid region—e.g. **south** strip **above** the south d-pad control, or a **corner** cell reserved for HUD (viewport spec §5.1 allows empty corners).
- **Z-order:** The orb must **not** be obscured by the canvas; it must **not** overlap the **active hit targets** of the d-pad cells. If the orb sits near a d-pad, **increase** hit padding or offset the orb so **fat-finger** errors are rare.
- **Input isolation:** Use **pointer capture** on the orb during drag and the viewport’s **`Map<PointerId, …>`** pattern so an orb drag does not toggle d-pad directions for the same pointer id (viewport spec §6.2).

---

## 8. Input

- **DOM path:** Register **`pointerdown`**, **`pointerup`**, **`pointercancel`**, and **`lostpointercapture`** on the HUD root element (or draggable child).
- **`preventDefault`:** Rely on **`touch-action: none`** on `#game-root` first; add **`preventDefault`** on orb handlers if needed to suppress scroll/zoom during drag.
- **Single active drag:** At most **one** drag session for this ability; ignore secondary pointers or follow the same **pointer id** discipline as chrome (viewport spec §6.2).

---

## 9. Assets

- If the HUD uses **`<img>`** or CSS **`background-image`**, **must** resolve URLs with **`import.meta.env.BASE_URL`** (viewport spec §5.2) so **`VITE_BASE`** / GitHub Pages layouts work.
- **Art** is produced under **`public/art/<slug>/`** per **wor-8vq0** / **`tools/sprite-generation/README.md`**; runtime paths are **`${import.meta.env.BASE_URL}art/<slug>/...`**.

---

## 10. Animation

- **Strip:** **4** frames in one sheet (layout per **wor-8vq0**, typically **1×4** row-major cells for indices 0–3).
- **Frame 0 — idle:** Shown when the ability is **ready** and **not** dragging.
- **During drag:** Show frame **0** as the **ghost** / dragged visual (no activation strip yet).
- **Frames 1–3 — activation:** Play **only** after a **successful** drop on the monster (`'ok'`). **Do not** play on miss, cooldown denial, or invalid target.
- **Stable ids:** Frame indices **must** match **`sprite-ref.json`** shipped with preset **wor-8vq0** (stable keys in **`frames`**; **`MANIFEST_PRESET_ID`** / asset id as defined in that preset module). Implementations read **`sprite-ref.json`** to map logical frame names to grid cells—**do not** hard-code pixel offsets that drift from the manifest.

---

**END SPEC**
