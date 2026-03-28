---
id: 2gp-xjhm
status: open
deps: [2gp-lo9d]
links: []
created: 2026-03-28T03:23:56Z
type: feature
priority: 0
assignee: user.email
parent: 2gp-hbb5
---
# Build SpriteSheet from uniform grid ImageSource

SpriteSheet.fromImageSource + grid options. Plan §C.2, §C.3.

## Design

Pure function where possible; Vitest for getSprite(0,0) on fixture.

## Acceptance Criteria

1) Uses fromImageSource. 2) spriteWidth/Height match fixture. 3) Vitest asserts grid sprite.

