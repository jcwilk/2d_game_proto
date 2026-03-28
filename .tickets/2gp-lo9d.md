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

`Resource` + `responseType: 'json'`; parse to typed structures. **Normative:** **`.cursor/plans/project-implementation-deep-dive.md`** §C.2 step 3, §C.4 (HTTP(S) loading).

## Design

Sample JSON under `public/` or `src`/fixtures; paths must be loadable over HTTP(S) in dev (not `file://` for the game bundle path per §C.4 checklist).

## Acceptance Criteria

1) `Loader` preloads JSON using `Resource` with `responseType: 'json'` (or the current documented equivalent in Excalibur’s API) **and** preloads the atlas image on the same engine-start path. 2) New code uses **`ImageSource`** for rasters—no legacy `Texture` construction patterns (**`.cursor/plans/project-implementation-deep-dive.md`** §C.2, API drift note). 3) JSON → typed parse is implemented so a **pure function** (or module) can be unit-tested with Vitest **without** a browser.

