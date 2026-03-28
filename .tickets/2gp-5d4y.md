---
id: 2gp-5d4y
status: open
deps: []
links: []
created: 2026-03-28T03:23:56Z
type: task
priority: 0
assignee: user.email
parent: 2gp-gu27
---
# Scaffold Vite TypeScript project with strict compiler options

Create a minimal Vite + TypeScript app (`package.json`, `vite.config.ts`, `index.html`, `src/main.ts`). **Normative:** **`CONVENTIONS.md`**, **`.cursor/plans/project-implementation-deep-dive.md`** intro + §F.

## Design

`tsconfig.json` **strict**; `src/main.ts` entry; **Node 22** for local dev to match CI (**`.cursor/plans/project-implementation-deep-dive.md`** §A.2.2). Do **not** add Phaser or Pixi.

## Acceptance Criteria

1) `package.json` has `dev`, `build`, and `preview` scripts; `npm run build` emits **`dist/`**. 2) `tsconfig` enables strict options; scaffold contains **no** `any`. 3) **`README.md`** states the app is **Vite + TypeScript** and links **`.cursor/plans/project-implementation-deep-dive.md`** for stack details.

