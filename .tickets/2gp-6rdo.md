---
id: 2gp-6rdo
status: closed
deps: []
links: []
created: 2026-04-19T19:44:57Z
type: feature
priority: 1
assignee: user.email
parent: 2gp-biy0
---
# Monster character type + art preset (fluffy dark fairy, giant claws)

Introduce character kind **`monster`** as a **named constant or small union** (as fits `main.ts` style) for clarity. Add a **new preset slug** under **`tools/sprite-generation/presets/<asset-id>/`** — presets are **auto-discovered** by the registry (same pattern as `merchant-character`; no manual list edit unless the repo’s registry truly requires one—follow existing slugs). Use **distinct** `MANIFEST_PRESET_ID` and **`KIND`** (e.g. `character_monster_walk`) in the preset module, mirroring `merchant-character` **strip geometry** and frame ids (`walk_0`…`walk_3`) so `createGridSheetLoader` + `spriteSheetFromGridImageSource` work the same way. Sheet subject: **fluffy dark fairy with giant claws**—readable small-scale isometric three-quarter, consistent with existing character presets. Run `npm run generate:spritesheet -- run --asset <id> --mode mock` so `public/art/<asset>/` manifest + `sheet.png` + `sprite-ref.json` are committed for CI. **Scene wiring:** assign the spawned monster to a **stable binding** (e.g. `const monsterActor` at module or setup scope in `main.ts`) so **2gp-real** can read world position without restructuring this ticket. Include **`mergeGridSheetLoaders`** for the new art path. Spawn at least one monster **Actor** on the isometric grid with reasonable parameters: scale via existing `CHARACTER_WALK_FRAME_PX`, `z` from `isoCharacterZFromWorldPos`, distinct grid coords from player and merchant, **horizontal flip** from position vs center like the merchant if appropriate, idle graphic (walk anim optional if trivial reuse). Colocated **`monster-character.test.ts`** (or equivalent) mirroring **`merchant-character.test.ts`** depth for manifest/frame expectations. No new gameplay beyond placement + visual presence (alert and merchant menus are other tickets).

## Design

Reuse avatar/merchant grid manifest shape; document monster identity strings in preset module for future regen (`--mode live`).

## Acceptance Criteria

typecheck + tests pass. Game shows a second NPC distinct from merchant; mock sheet assets under `public/art/` tracked. `npm run generate:spritesheet -- info --asset <id>` reports consistent manifest. Preset module defines unique `MANIFEST_PRESET_ID` / `KIND`; `monsterActor` (or equivalent) is reachable for follow-on proximity UI.

