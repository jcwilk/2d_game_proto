---
id: 2gp-czux
status: closed
deps: []
links: []
created: 2026-04-19T03:02:13Z
type: epic
priority: 2
assignee: user.email
---
# Epic: TypeScript migration — tools and sprite pipeline

Migrate first-party **tools/** source (especially **tools/sprite-generation/** and top-level **tools/*.mjs** CLIs) to TypeScript and remove raw **.mjs** implementations there where feasible. **src/** is already TS-first; Vite/Vitest/Playwright configs may stay **.ts**. **Out of scope unless explicitly expanded:** vendored **scripts/ticket**, other third-party, generated assets, and config-only files if a tool requires JS. Work is parallelized where the import graph allows (**Ticket 0** `2gp-gwjc` + **A1–A4**), then a strict sprite-generation chain (**B5→B6→C7→C8** mapped to `2gp-bdeg` → `2gp-9ykt` → `2gp-hrpb` → `2gp-e5lc`), then stitch tickets (**S1** `2gp-y4cn`, **S2** `2gp-nxd2`) and final gate **`2gp-rl8t`**. Authoritative test entrypoints: root **README.md** (e.g. **npm test**, **npm run test:e2e**) and **.github/workflows** as applicable; design detail in **tools/sprite-generation/README.md**. There is no **specs/README.md** hub today—cite area specs under **specs/** if present.

## Success criteria (close epic when all hold)

- All child tickets through **`2gp-rl8t`** are closed.
- **tools/**/*.mjs** first-party implementation files eliminated except documented exceptions (config-only, vendored, generated).
- **npm run typecheck** (and **typecheck:tools** if split in **2gp-gwjc**) passes; **npm test** passes per **README.md**; **npm run build** passes.
- No **package.json** scripts reference removed **tools/*.mjs** entrypoints.

## Notes

**2026-04-19T03:39:35Z**

Epic closure: All children through 2gp-rl8t already closed. Verified 2026-04-18: npm run typecheck, npm test, npm run build pass on js_to_ts. tools/**/*.mjs: zero first-party implementation files (glob). package.json scripts use node --experimental-strip-types tools/*.ts only—no tools/*.mjs paths. Aligns with 2gp-rl8t final gate (typecheck/build/test; rg/doc allowlist for .mjs string refs).

**2026-04-19 (merge to main)**

Re-confirmed on `main` after merging `docs/preset-composition-structure-plan`: success criteria above remain satisfied; see **`2gp-rl8t`** notes for final-gate evidence on that branch.
