---
id: 2gp-kcik
status: open
deps: [2gp-swz6]
links: []
created: 2026-03-28T03:23:56Z
type: task
priority: 0
assignee: user.email
parent: 2gp-hbb5
---
# Define TypeScript types for atlas JSON and frame manifest

Model JSON and manifest key→rects. Plan §C.2 step 3, §C.4.

## Design

`src/art/atlasTypes.ts` for types; use a distinct name for runtime JSON if needed (e.g. `atlasManifest.ts` vs `public/art/manifest.json`) to avoid confusion. **`CONVENTIONS.md`** may mention `deno.json`; authoritative strict TypeScript for this repo is **`tsconfig.json`** / Vite—follow those. `interface` per CONVENTIONS.md.

## Acceptance Criteria

1) Types cover packed `sourceViews` `{ x, y, width, height }` (pixel, top-left origin) and grid metadata needed by `SpriteSheetGridOptions`. 2) Parse/validation fails fast with a clear message on invalid JSON (throw or `Result`—pick one style and use consistently with ticket **Add unit tests for atlas JSON to SourceView mapping** `2gp-dydr`).

