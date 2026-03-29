# Square viewport + directional chrome (spec)

**Status:** implementation-ready  
**Stack:** Vite + TypeScript + Excalibur (`src/main.ts`, `src/engine.ts`)

## 1. Goal

- The **Excalibur logical resolution** is **square** (width === height in CSS pixels), replacing the current **960×540** rectangle (`VIEWPORT_WIDTH` / `VIEWPORT_HEIGHT` in `src/engine.ts`).
- **Browser layout** around that square shows **four on-screen directional controls** using existing art:
  - `/art/dpad/up/dpad.png`
  - `/art/dpad/down/dpad.png`
  - `/art/dpad/left/dpad.png`
  - `/art/dpad/right/dpad.png`  
  (Vite `public/` → served at those URLs.)
- **Pointer and touch** on each control **moves the controllable `Actor`** (`src/main.ts`) in that direction.

## 2. Normative references and reconciliation

| Source | Relevant rule |
|--------|----------------|
| `src/engine.ts` (header) | Single module for logical `width`/`height`; `DisplayMode` + `suppressHiDPIScaling` policy. |
| `.cursor/plans/project-implementation-deep-dive.md` §D.1 | Centralize viewport in `engine.ts`; no ad-hoc canvas sizes elsewhere. |
| §D.2 | Pointer path + `preventDefault` / scroll guard; `touch-action` on canvas container. |

**Conflict to resolve in implementation (do not ignore):** §D.2 recommends **one** input path via **Excalibur’s** pointer APIs for game input. The **chrome controls lie outside the canvas** and will not receive events through `engine.input.pointers` unless the implementation forwards them artificially. This spec **explicitly allows** a **second, DOM-native** path for the overlay only:

- **Canvas / world:** Continue to use `subscribePointerInput` (`src/input/pointer.ts`) when gameplay needs canvas-relative pointer data.
- **Chrome / d-pad:** Use **`addEventListener` on HTML elements** (`pointerdown`, `pointerup`, `pointercancel`, `lostpointercapture`) so hit targets are stable and independent of Excalibur’s canvas scaling. Document both paths in `pointer.ts` header comment (or a one-line pointer README comment) so §D.2’s “single abstraction” becomes “single **documented** split: engine vs chrome.”

**Note:** `HIERARCHICAL_TRUTH_AND_ALIGNMENT_MANDATE.md` is **not present** in this repo; if it is added later, re-check this split against it.

**Plan follow-up (non-blocking for this feature):** `.cursor/plans/project-implementation-deep-dive.md` §D.3 still mentions a **16∶9** reference aspect; after this work the **logical** playfield is **1∶1**. Update that plan row in a separate edit so QA guidance matches the product.

## 3. Logical viewport (square)

- **Replace** `VIEWPORT_WIDTH` / `VIEWPORT_HEIGHT` with a single exported constant, e.g. **`VIEWPORT_SIZE`**, and derive:

  ```ts
  export const VIEWPORT_SIZE = 540; // or 720 — pick one integer; see §3.1
  export const VIEWPORT_WIDTH = VIEWPORT_SIZE;
  export const VIEWPORT_HEIGHT = VIEWPORT_SIZE;
  ```

  Alternatively export **only** `VIEWPORT_SIZE` and update call sites to use one name; either way **one** source of truth in `engine.ts`.

### 3.1 Choosing the numeric size

Pick **one** integer `VIEWPORT_SIZE` such that:

- Gameplay remains readable on desktop and phone; **540** ties to the previous **height** (keeps similar vertical pixel count to old 960×540); **720** is a reasonable alternative if more playfield is desired.
- Document the chosen value in `engine.ts` next to the constant.

**Actor spawn:** Center remains `vec(VIEWPORT_SIZE / 2, VIEWPORT_SIZE / 2)` (replacing separate width/height halves).

### 3.2 Chrome movement speed

Export a single constant (e.g. **`CHROME_MOVE_SPEED`** or **`DPAD_MOVE_SPEED_PX_PER_SEC`**) from **`src/engine.ts`** next to the viewport constants so tuning stays co-located with resolution policy—**or** from `directionalChrome.ts` with a one-line comment pointing at `engine.ts` if you prefer input-local tuning. Value is **pixels per second** in **world/logical** space (same units as `actor.vel`).

## 4. DisplayMode and scaling (`FitScreen` vs alternatives)

- **Default:** Keep **`DisplayMode.FitScreen`** and **`suppressHiDPIScaling`** as today (`createEngineOptions`), unless a prototype experiment shows the square canvas cannot be laid out correctly.
- **Layout contract:** The **HTML element that wraps `#game-canvas`** must be **square in CSS** (e.g. `aspect-ratio: 1 / 1` + bounded width/height, or grid cell that forces 1∶1). Excalibur then **letterboxes or scales** the **internal** resolution inside that element per `FitScreen`—the **outer** square is a **CSS box**, not a change to Excalibur’s letterboxing model.
- **When `FillScreen` or fixed pixel container might be needed:** Only if product QA finds `FitScreen` + square wrapper produces inconsistent black bars or double letterboxing. If switching, **re-document** `DEFAULT_DISPLAY_MODE` in `engine.ts` and this spec in one sentence.

## 5. DOM structure vs Excalibur-only

**Recommendation: HTML overlay + CSS grid (not Excalibur-only UI).**

| Approach | Verdict |
|----------|---------|
| **HTML overlay** | **Preferred:** Uses the existing PNGs as `<img>` or CSS `background-image`, accessible hit targets, straightforward `touch-action` per region, no second rendering pipeline inside the canvas. |
| **Excalibur-only** (sprites in scene) | Possible but fights the requirement “remaining **screen** real estate”: the play camera would need to exclude UI, coordinate transforms get messy on resize, and duplicating layout logic already solved by CSS. **Do not use** for this feature unless a later ticket explicitly drops HTML chrome. |

### 5.1 Target HTML shape (illustrative)

Extend **`index.html`** under `#app` / `#game-root` so `#game-root` is a **layout container** (names are suggestive):

```html
<div id="game-root">
  <div id="game-chrome-up" class="game-chrome" data-dir="up" aria-label="Move up">…</div>
  <div id="game-chrome-left" class="game-chrome" data-dir="left" …>…</div>
  <div id="game-canvas-wrap">
    <canvas id="game-canvas"></canvas>
  </div>
  <div id="game-chrome-right" class="game-chrome" …>…</div>
  <div id="game-chrome-down" class="game-chrome" …>…</div>
</div>
```

Use **CSS Grid** on `#game-root`, e.g. three rows × three columns with the canvas in the center cell and chrome in **north / south / west / east** cells. **Corner cells** may be empty or used for spacing.

- **`#game-canvas-wrap`:** `aspect-ratio: 1 / 1`, `min-width: 0`, `min-height: 0` so flex/grid shrink works. **Do not** add `object-fit` on the canvas unless manual QA shows a concrete glitch—Excalibur + `FitScreen` own canvas sizing; extra CSS often fights the engine.

### 5.2 Art wiring

- Each chrome cell contains an **`<img>`** (or a container whose background is set in TS) for `up` | `down` | `left` | `right`.
- **URL policy (normative):** This repo’s **`vite.config.ts`** sets **`base`** from **`VITE_BASE`** (see plan §A.2.1). Root-absolute paths like **`/art/dpad/...`** break on **GitHub project Pages** when `base` is **`/<repo>/`**. Therefore **do not** hard-code static `src="/art/..."` in raw **`index.html`** unless production is guaranteed to use `base: '/'`.
- **Required pattern:** Resolve public URLs with Vite’s **`import.meta.env.BASE_URL`** (trailing slash per Vite). Example: `` `${import.meta.env.BASE_URL}art/dpad/up/dpad.png` `` — set **`img.src`** from **TypeScript** when wiring chrome (e.g. inside `attachDirectionalChrome`), or inject via the same module at startup. Keeps dev (`base` `/`) and Pages (`base` `/repo/`) consistent.
- **No** embedding of unrelated assets; paths remain under **`art/dpad/<dir>/dpad.png`** relative to the site root (i.e. `public/art/dpad/...` in the repo).

## 6. Hit targets, pointer capture, and movement semantics

### 6.1 Hit targets

- **Minimum:** The full grid cell (or a padded inner `button`-like element) is the hit target, not only the opaque pixels of the PNG—improves touch ergonomics.
- **Z-order:** Chrome must sit **above** the canvas in DOM order only where needed; typically **siblings** in grid—canvas center, chrome **does not** cover the playfield.

### 6.2 Events

- Listen on each chrome node: **`pointerdown`** → register that pointer for that direction; **`pointerup`** / **`pointercancel`** / **`lostpointercapture`** → unregister that pointer for that direction.
- **Multi-pointer (normative):** Do **not** model each direction as a single boolean. Maintain a **`Map<PointerId, Direction>`** (or parallel structure) so each **`pointerup`** knows which direction to clear. For **each** of the four directions, also maintain a **`Set<PointerId>`** of pointers currently down on that control: on **`pointerdown`**, insert into the **`Map`** and add `pointerId` to that direction’s **`Set`**; on **`pointerup`** / **`pointercancel`** / **`lostpointercapture`**, look up `pointerId`, remove it from the corresponding **`Set`**, delete the **`Map`** entry (no-op if missing). A direction contributes to the raw vector iff its **`Set`** is **non-empty**. This avoids wrong “release” when two fingers held the same direction and one lifts.
- Optionally call **`setPointerCapture`** on the **chrome element** for that `pointerdown` so drag-off still receives `pointerup`; with per-`pointerId` sets, capture remains safe for multi-direction chords.
- **`preventDefault`:** Rely on **`touch-action: none`** on `#game-root` (§8) first; add **`pointerdown` `preventDefault`** on chrome only if a device/browser still scrolls the page during drags.
- **Do not** rely on `click` alone—touch users need **press-and-hold**.

### 6.3 Movement model (normative choice)

**Continuous velocity while held** (not discrete steps per tap):

- **Why:** Matches common virtual d-pad expectations; holding “up” keeps the actor moving; release stops. Easier to tune with a single **max speed** and **acceleration optional** later.
- **Implementation sketch:** From the per-direction **pointer sets** (§6.2), derive which directions are **active** (set non-empty). Build a **raw** vector `(dx, dy)` with each axis in **`{-1, 0, +1}`**. **Opposite directions on the same axis cancel:** if both up and down are active, vertical component is **0**; same for left/right. Then **normalize** `(dx, dy)` if non-zero and multiply by **`CHROME_MOVE_SPEED`** (see §3.2). Assign to **`actor.vel`**. Excalibur **`Actor.vel`** is **pixels per second** in **world space** (same units as logical viewport pixels); no extra conversion for this prototype.
- When no direction is active on any axis, `actor.vel = vec(0, 0)`.
- **Diagonal:** Normalization ensures diagonal speed matches single-axis speed (not √2×).

**Alternative (out of scope unless requested):** stepped movement per tap—would need different UX and timing; this spec **does not** choose that.

## 7. Resize behavior

- **Viewport:** Logical `VIEWPORT_SIZE` stays **fixed** at load (current project policy in `engine.ts`); **no** dynamic resize of Excalibur internal resolution on window resize unless a separate ticket changes global policy.
- **CSS:** `#game-root` uses **viewport-relative or flex sizing** (e.g. `height: 100dvh` on `#app`, grid `minmax(0, 1fr)` for tracks) so on small phones the **square** shrinks and chrome strips remain usable.
- **Canvas:** Excalibur’s `FitScreen` scales the fixed logical buffer into the square wrapper; no extra manual `canvas` width/height setting in application code beyond what `createEngine` already does.

## 8. Accessibility and mobile

- **`touch-action`:** Keep **`touch-action: none`** on `#game-root` (see `src/styles.css`) so the browser does not scroll or gesture-capture touches intended for the game. **Chrome cells** inherit or explicitly set `touch-action: none` so presses are not interpreted as scrolls.
- **Labels:** Each control should have **`aria-label`** (e.g. “Move up”) for assistive tech; role **`button`** or native `<button>` styled transparently if semantics matter. Decorative **`<img>`** chrome may use **`alt=""`** when the name is provided on the interactive parent.
- **Keyboard (optional follow-up):** Not required for this spec; if added, Arrow keys should mirror the same movement state machine.

## 9. Wiring: events → actor

1. **Bootstrap (`main.ts`):** After `actor` is created and added to the scene, call e.g. **`attachDirectionalChrome(root)`** from `src/input/directionalChrome.ts` (signature need not include **`actor`** if velocity is applied from the scene hook).
2. **`attachDirectionalChrome`:**
   - Queries `.game-chrome` or known IDs under `root`.
   - Registers DOM pointer handlers; maintains **§6.2** **`Map<PointerId, Direction>`** and per-direction **`Set<PointerId>`**; exposes **active directions** to the game loop (getter or small read API).
3. **Movement application:** **Prefer** **`mainScene.onPreUpdate`** (Excalibur: equivalent to **`mainScene.on('preupdate', …)`**) so one handler reads chrome state and sets **`actor.vel`**. Reserve **`actor.on('preupdate')`** for actor-local logic if the project grows.
4. **Cleanup:** On hot reload or teardown, remove listeners (mirror `subscribePointerInput`’s `unsubscribe` pattern).

**Do not** set `actor.pos` directly each frame from DOM (skips physics/collision later); **velocity** keeps one coherent motion model.

## 10. Testing notes (lightweight)

- **Unit test** (Vitest): pure function from active directions → `(dx, dy)` with **opposite cancellation** and **normalization** (diagonal speed + up+down = 0).
- **Manual QA:** Phone portrait/landscape, verify no page scroll, four directions + diagonals, release stops movement; with **`VITE_BASE=/<repo>/`** locally or staging, confirm d-pad images load (BASE_URL smoke).

## 11. File-level checklist (implementer)

| Item | Action |
|------|--------|
| `src/engine.ts` | Square logical viewport; single `VIEWPORT_SIZE` (or width/height aliases). |
| `index.html` | Grid + chrome nodes + canvas wrapper. |
| `src/styles.css` | Grid layout, square canvas cell, chrome sizing, inherit `touch-action`. |
| `src/main.ts` | Center actor; call chrome attach after actor exists. |
| `src/input/directionalChrome.ts` (new) | DOM listeners + shared direction state; export `attach` + `detach`; set **`img.src`** using **`import.meta.env.BASE_URL`** (§5.2). |
| `src/input/pointer.ts` | Comment update documenting engine vs chrome split (per §2). |

---

**END SPEC**
