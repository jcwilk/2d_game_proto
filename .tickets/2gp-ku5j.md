---
id: 2gp-ku5j
status: open
deps: [2gp-kcik, 2gp-lo9d]
links: []
created: 2026-03-28T03:23:56Z
type: feature
priority: 1
assignee: user.email
parent: 2gp-hbb5
---
# Build SpriteSheet from packed JSON via fromImageSourceWithSourceViews

fromImageSourceWithSourceViews + sparse options. Plan §C.2, §C.3 pivot.

## Design

Stable sourceViews order; document Sprite.origin policy for packed.

## Acceptance Criteria

1) Test with synthetic PNG+JSON. 2) Comment §C.2 step 4 bullet 2. 3) README/module states origin policy.

