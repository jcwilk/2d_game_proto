---
id: 2gp-5ixa
status: closed
deps: []
links: []
created: 2026-03-28T16:21:05Z
type: task
priority: 1
assignee: user.email
parent: 2gp-3y3y
---
# sprite-gen: generators (mock + fal)

Implement under **`tools/sprite-generation/generators/`**:

- **`mock.mjs`** — Extract mock rendering from **`dpad-workflow.mjs`** ~**418–491** (`pointInTriangle`, `triangleForDirection`, `renderMockPng`, etc.). The mock accepts an **injectable shape/renderer function from the preset** so non-dpad presets can swap geometry without forking the module.
- **`fal.mjs`** — Extract **`resolveFalCredentials`**, **`formatFalClientError`**, **`parseImageSize`**, download helpers, and **`falSubscribeToBuffer`** from ~**312–364** and ~**640–706**.
- **`types.mjs`** — Shared **JSDoc** typedefs for generator config and return values.

**Shared contract (plan):**

```js
// one frame
async function generate(frame, config) -> { buffer: Buffer, metadata: {...} }
// optional sheet (fal); mock may omit or stub if preset does not use sheet
async function generateSheet(frames, config) -> { buffer: Buffer, metadata: {...} }
```

## Acceptance criteria

- [x] **`generators/mock.mjs`**: Vitest asserts **256×256** output (or preset `tileSize`), alpha channel, and **pixel spot checks** at known coordinates for a fixed seed/shape.
- [x] **`generators/fal.mjs`**: Tests use **mocked `fetch` / fal client** or cover **pure helpers only** (`parseImageSize`, credential resolution from env, error formatting) — **no network** in CI.
- [x] **`types.mjs`** documents the **`generate` / `generateSheet`** contract for **2gp-98mn**.

## Notes

**2026-03-28T16:25:39Z**

Added tools/sprite-generation/generators: mock.mjs (generate/generateSheet, injectable shapeForFrame, dpad defaults), fal.mjs (credentials, parseImageSize, formatFalClientError, download*, falSubscribeToBuffer with injectable log/fal/fetch), types.mjs JSDoc for pipeline contract (2gp-98mn). dpad-workflow.mjs imports mock+fal; Vitest mock.test.mjs + fal.test.mjs (no network).
