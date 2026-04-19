---
id: 2gp-1os4
status: closed
deps: [2gp-gwjc]
links: []
created: 2026-04-19T03:02:23Z
type: task
priority: 1
assignee: user.email
parent: 2gp-czux
---
# fal-raster-generate → TypeScript

Convert **tools/fal-raster-generate.mjs** to **.ts**; update **package.json** scripts to use the **`2gp-gwjc`** runner. Preserve CLI behavior and env usage (**FAL_KEY**, **FAL_KEY_ID** / **FAL_KEY_SECRET**, flags, exit codes). Update **tools/README.md**, **tools/sprite-generation/README.md**, and in-CLI help text that cite **.mjs** paths.

## Acceptance Criteria

After **`2gp-gwjc`**, **npm run typecheck** (and **typecheck:tools** if split) includes this file; **npm test** green. **rg** `fal-raster-generate\.mjs` has no stale first-party references in **tools/**, **src/**, or tests (allow vendored/third-party as documented).

