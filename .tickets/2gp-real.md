---
id: 2gp-real
status: open
deps: [2gp-6rdo]
links: []
created: 2026-04-19T19:45:00Z
type: feature
priority: 2
assignee: user.email
parent: 2gp-biy0
---
# Exclamation indicator when player near monster

When the player avatar moves within a configurable **world-space** distance of the **monster** `Actor` (**center-to-center** or document the chosen metric—keep consistent with **2gp-v4mi** if a shared proximity helper is introduced), show a visible exclamation above the monster’s **head** (prototype: fixed camera—offset above feet/`actor.pos` using scale-aware px offset so it clears the sprite). **DOM overlay:** position using canvas **`getBoundingClientRect`** + mapping from logical **`VIEWPORT_SIZE`** to screen (HiDPI-safe); layer uses **`pointer-events: none`** so clicks pass to merchant actions or chrome. **Or** Excalibur `Text`/`Label` if preferred—minimal new deps. Hide when out of range. No new sprite art—Unicode `!` or CSS. Coordinate **z-index** with **2gp-v4mi** so the action row remains clickable when both NPCs are on screen.

## Acceptance Criteria

Approaching the monster toggles the mark on; leaving range toggles off. No console errors; marker does not steal pointer events. Covered by a small unit test if pure math (distance / in-range) is factored, or a short manual QA note in close for DOM alignment if only scene wiring.

