---
id: 2gp-gwjc
status: closed
deps: []
links: []
created: 2026-04-19T03:02:23Z
type: chore
priority: 0
assignee: user.email
parent: 2gp-czux
---
# TS toolchain for tools (Node runner, tools tsconfig, Vitest, typecheck)

Establish one supported way to run and typecheck tools/**/*.ts under this single-package repo: pick either tsx as devDependency OR Node 22+ with --experimental-strip-types (document the choice in the ticket body when implementing; no unresolved either/or). Add tools/tsconfig.json (or project references) so tsc --noEmit covers tools with moduleResolution suited to Node ESM (e.g. NodeNext/Node16—do not blindly reuse root bundler resolution without verification). Extend npm typecheck (or add typecheck:tools) so both src/ and tools/ typecheck without rootDir fights. Define how tools imports of src (e.g. atlas types in tests) participate in typechecking (composite refs, path mapping, or single program).

## Design

Vitest: update vitest.config.ts to include **tools/\*\*/\*.test.ts**. Keep **tools/\*\*/\*.test.mjs** in include until the last **.mjs** test is removed (**2gp-y4cn** owns removing the **.mjs** glob when none remain—do not drop it early). Align **package.json** scripts and GitHub Actions with the chosen runner.

Record the **exact** local and npm-script invocation for tools (including any argv prefix future spawns should use—**tsx** vs **node --experimental-strip-types**, etc.) in **README.md**, **tools/README.md**, or **AGENTS.md** so dependents (**2gp-veak**, **2gp-e5lc**, **2gp-bdeg**) share one grepable source of truth.

## Acceptance Criteria

Evidence: **npm run typecheck** (and **typecheck:tools** if split) passes; **tsc --noEmit** for the tools program passes; after the first **tools/\*\*/\*.test.ts** exists, **npm test** runs it while **.mjs** tests remain included until migrated.

**GitHub Actions:** the workflow job that runs typecheck/tests (e.g. **.github/workflows/pages.yml** `build` job) uses the same **npm run typecheck** / **npm test** entrypoints as local—no divergent hardcoded **node tools/\*.mjs** in YAML if scripts have moved to the Ticket 0 runner.

**Typecheck vs Vitest:** tools sources typecheck under **tools/tsconfig** and run under Vitest without unresolved-module drift; if resolver behavior must differ between **tsc** and Vitest, document the exception next to the runner notes.


## Notes

**2026-04-19T03:05:57Z**

TS toolchain: Node 22 --experimental-strip-types (no tsx). Added tools/tsconfig.json (extends root, NodeNext). typecheck runs root tsc + tsc -p tools. Vitest include adds tools/**/*.test.ts; smoke test tools/tsconfig-toolchain.smoke.test.ts. Docs: tools/README.md + AGENTS.md pointer. CI already npm run typecheck/test.
