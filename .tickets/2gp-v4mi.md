---
id: 2gp-v4mi
status: open
deps: []
links: []
created: 2026-04-19T19:45:00Z
type: feature
priority: 2
assignee: user.email
parent: 2gp-biy0
---
# Merchant proximity action menu (Attack, Talk, Trade, Hug)

When the player is within **proximity** of the merchant **`Actor`**, show a horizontal row of clickable labels **above the merchant’s head** (same **center-to-center** distance semantics—or shared helper—as **2gp-real** if extracted; anchor using sprite scale + offset from world position, **HiDPI**-safe mapping via canvas `getBoundingClientRect` vs logical viewport). Options: **Attack**, **Talk**, **Trade**, **Hug**. No new sprites or frame animations—HTML buttons or styled spans. Each click runs a distinct handler (console.log or lightweight in-game feedback is fine). Add a simple motion cue on the player or merchant on interaction—e.g. brief position nudge, scale pulse, or CSS transform—without new art assets. Hide menu when out of range; **game movement must not require clicking the menu** (overlay should not cover the full canvas with opaque hit areas). **Stacking:** define **`z-index`** so the row sits above the canvas and does not sit behind the monster **!** overlay from **2gp-real**; **!** should use `pointer-events: none` (see **2gp-real**). Respect **`specs/viewport-square-dpad-chrome.md`** DOM vs canvas split (menu is DOM).

## Acceptance Criteria

All four options visible when near merchant; each logs or visibly confirms. Menu hidden when far. typecheck + tests pass; add test for pure proximity/menu visibility helper if extracted. Document chosen **z-index** / **pointer-events** for the menu root vs sibling overlays.

