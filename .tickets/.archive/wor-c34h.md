---
id: wor-c34h
status: closed
deps: [wor-3wg7]
links: []
created: 2026-04-19T16:37:46Z
type: feature
priority: 2
assignee: Cursor Agent
parent: wor-isz6
---
# Add merchant-character walk preset (second character slug)

## Design

New registry slug `presets/merchant-character/merchant-character.ts` exercising `character-preset` + `character-defaults` (base+delta). **Ids:** `ASSET_ID` = `merchant-character`; `MANIFEST_PRESET_ID` = `character_merchant_walk`; **`KIND` = `character_merchant_walk`** (distinct from avatar’s `character_walk_sprite`). **Frames:** same count, order, and ids as avatar-character (`walk_0` … `walk_3`) unless this ticket explicitly documents a deliberate change. Prompt bundle: merchant/NPC identity vs avatar. `public/art/merchant-character/` mock manifest path per registry.

## Acceptance Criteria

PRESETS includes merchant-character with the ids above; list/run mock works: `npm run generate:spritesheet -- run --asset merchant-character --mode mock`; preset module tests colocated or registry test updated; no regression to avatar-character.

