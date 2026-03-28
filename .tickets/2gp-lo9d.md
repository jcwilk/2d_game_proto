---
id: 2gp-lo9d
status: open
deps: [2gp-kcik]
links: []
created: 2026-03-28T03:23:56Z
type: feature
priority: 0
assignee: user.email
parent: 2gp-hbb5
---
# Load atlas JSON with Excalibur Resource responseType json

Resource responseType json; parse typed. Plan §C.2.

## Design

Sample JSON in public/ or assets; HTTP(S) paths §C.4.

## Acceptance Criteria

1) `Loader` preloads JSON (via `Resource` + `responseType: 'json'` or equivalent documented API) and image on the engine start path. 2) New code uses **`ImageSource`** / current raster path—no legacy `Texture` patterns (plan §C.2 footnote). 3) Pure JSON→typed parse is extractable for Vitest without a browser.

