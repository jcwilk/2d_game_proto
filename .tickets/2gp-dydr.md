---
id: 2gp-dydr
status: closed
deps: [2gp-kcik, 2gp-1voe]
links: []
created: 2026-03-28T03:23:56Z
type: feature
priority: 1
assignee: user.email
parent: 2gp-9buv
---
# Add unit tests for atlas JSON to SourceView mapping

**Normative:** **`.cursor/plans/project-implementation-deep-dive.md`** §C.2, §C.4 (pixel rects, top-left origin).

## Design

Use fixture JSON; invalid inputs must exercise the same **error style** as **Define TypeScript types for atlas JSON** (`2gp-kcik`)—throw **or** `Result`, not both.

## Acceptance Criteria

1) Tests live under `src/**/*.test.ts`. 2) At least **one** test passes **valid** JSON mapping to `sourceViews`. 3) At least **one** test covers an **invalid** input and expects the **documented** failure mode (throw or `Result` error) from `2gp-kcik`.


## Notes

**2026-03-28T03:51:23Z**

atlasJsonParse.test.ts: valid path maps fixture through atlasFrameRectToSourceView; invalid path asserts throw with ATLAS_JSON_ERROR_PREFIX (same style as atlasTypes throws).
