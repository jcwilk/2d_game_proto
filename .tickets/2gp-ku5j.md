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

**Normative:** **`.cursor/plans/project-implementation-deep-dive.md`** §C.2 step 4 (packed path), §C.3 (pivot / origin).

## Design

Keep **`sourceViews`** order stable for index-based access; document **`Sprite.origin`** (or `GetSpriteOptions.origin`) for packed frames.

## Acceptance Criteria

1) Vitest (or equivalent) uses a **synthetic** PNG + JSON fixture with `fromImageSourceWithSourceViews`. 2) Code comment cites §C.2 step 4 **bullet 2** (packed / arbitrary rects). 3) `README.md` or module doc states the **origin** policy for packed sprites.

