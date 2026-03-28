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

Model JSON and manifest key→rects. **Normative:** **`.cursor/plans/project-implementation-deep-dive.md`** §C.2 step 3, §C.4 (name vs index / manifest).

## Design

Prefer `src/art/atlasTypes.ts` (exact path may vary—closure notes record the chosen files). Use distinct names for **hand-authored types** vs **`public/` JSON filenames** to avoid import confusion. **`CONVENTIONS.md`** may mention `deno.json`; **authoritative** compiler settings are **`tsconfig.json`** with Vite. Prefer `interface` for object shapes per **`CONVENTIONS.md`**.

## Acceptance Criteria

1) Types cover packed `sourceViews` as `{ x, y, width, height }` (**pixel**, **top-left** origin) and grid metadata required by `SpriteSheetGridOptions` (see **`.cursor/plans/project-implementation-deep-dive.md`** §C.3). 2) Parse/validation **fails fast** with a **clear error message** on invalid JSON. Choose **either** throwing **or** a `Result`/similar pattern **once** and use the **same** style in **Add unit tests for atlas JSON to SourceView mapping** (`2gp-dydr`) tests.

