---
id: 2gp-biy0
status: open
deps: []
links: []
created: 2026-04-19T19:44:51Z
type: epic
priority: 2
assignee: user.email
---
# Epic: WASD, monster NPC, proximity UI

Desktop-targeted **WASD** (and optional arrow keys in the implementation ticket) alongside the d-pad; add a **monster** character type (fluffy dark fairy with giant claws) with tuned placement/scale/`z` parameters; show a **Unicode/CSS exclamation** (no new UI sprite art) over the monster when the player is close; show a row of **DOM** clickable actions (Attack, Talk, Trade, Hug) above the merchant when close, with **brief motion/visual feedback** on action (details in child tickets—no new sprite frames for UI). Governs: **specs/viewport-square-dpad-chrome.md** for the engine vs DOM input split—keyboard extends the same **active-direction** model as directional chrome; proximity UIs stay DOM-layered like the d-pad.

