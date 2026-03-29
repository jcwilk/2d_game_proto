---
id: 2gp-tre7
status: open
deps: [2gp-6srx]
links: []
created: 2026-03-29T15:09:24Z
type: feature
priority: 1
assignee: user.email
parent: 2gp-01w4
tags: [sprite-gen, character, prompt, falsprite]
---
# Character sheet T2I: falsprite-aligned prompt (buildSpritePrompt semantics)

Revise character sheet text-to-image prompting to closely match [falsprite](https://github.com/lovisdotio/falsprite), especially technical requirements comparable to `buildSpritePrompt`: clear silhouette, flat/chroma background, explicit grid semantics for the sheet, and other constraints from upstream `lib/fal.mjs` (or current falsprite source). Use web research and/or vendored upstream as the wording source of truth; align `tools/sprite-generation/presets/character.mjs` / pipeline prompt assembly accordingly.

## Acceptance Criteria

- [ ] Prompt construction is traceable to falsprite’s `buildSpritePrompt` (or equivalent) requirements: at minimum silhouette readability, flat single-color background suitable for keying/matting, and explicit **2×2** grid / cell semantics consistent with the character preset sheet layout (after layout ticket lands).
- [ ] Comment or short note in-repo cites falsprite revision or `lib/fal.mjs` reference used for parity (link or path), so future drift can be detected.
- [ ] `npm run mock:character-workflow` (or `npm run character-workflow` with default mock mode) completes without error; no requirement to bill a live FAL generate in CI unless the project already mandates it elsewhere.

