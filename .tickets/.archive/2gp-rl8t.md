---
id: 2gp-rl8t
status: closed
deps: [2gp-nxd2]
links: []
created: 2026-04-19T03:02:23Z
type: chore
priority: 3
assignee: user.email
parent: 2gp-czux
---
# TS migration final gate: critique-and-refine verification

Final verification after **S1** **`2gp-y4cn`** and **S2** **`2gp-nxd2`**. Spawn Cursor **Task** with **`subagent_type: critique-and-refine`** per **`.cursor/agents/critique-and-refine.md`**.

**Brief (minimum):** follow that agent’s **Goal / Deliverable / Constraints / Starting point** sections; include commands **npm run typecheck** (and **typecheck:tools** if present in **package.json**), **npm run build**, **npm test**. **E2E:** run **npm run test:e2e** when local env matches **README.md**; if secrets/browser block CI-grade verification, record **best-effort** outcome and blocker—do not treat “not run” as success without explanation.

**rg gate:** run e.g. **`rg '\.mjs\b' tools src --glob '!**/node_modules/**'`**; paste or summarize hits; every hit must be allowlisted in ticket notes (**scripts/ticket**, intentional config-only JS, generated/vendor paths, archived tickets, clearly marked historical comments) or fixed.

## Acceptance Criteria

**critique-and-refine** completes with **verdict** using that agent’s vocabulary (**proceed**, **capped**, **unresolved themes**) plus concrete evidence; **rg** allowlist recorded; **package.json** scripts reference no removed **tools/\*.mjs**; follow-up work spun out as new tickets if needed.

## Verification closure (2026-04-19) — main branch (`js_to_ts`)

### Commands (all passed)

| Command | Outcome |
|---------|---------|
| `npm run typecheck` | Pass (`tsc --noEmit && tsc --noEmit -p tools/tsconfig.json`; no separate `typecheck:tools` in **package.json**) |
| `npm run build` | Pass |
| `npm test` | Pass |
| `npm run test:e2e` | Pass (1 Playwright smoke, Chromium) |

### package.json scripts

All tool entrypoints use `node --experimental-strip-types tools/<name>.ts` only — no **`tools/*.mjs`** references.

### critique-and-refine (Task, `.cursor/agents/critique-and-refine.md`)

- **Verdict:** **proceed** — **capped:** none — **unresolved themes:** none  
- **Rounds:** 2 (cross-critique lanes approved final summary; evidence: command outcomes + allowlist paths aligned to repo).

### rg gate (`.mjs` in `tools/`, `src/`)

`rg` is not available in this environment (`command not found`). Equivalent audit:

`git grep -nE '\.mjs\b' -- tools src`

**`src/`:** no matches.

**Allowlist (every `tools/` hit):**

| File | Classification |
|------|------------------|
| `tools/README.md` | Documentation: legacy Vitest `tools/**/*.test.mjs` glob removal (**2gp-y4cn**) |
| `tools/sprite-generation/prompt.ts` | Docstrings: external falsprite GitHub `lib/fal.mjs` URLs (not repo files) |
| `tools/sprite-generation/generators/fal.ts` | Comment: external falsprite `api/generate.mjs` reference |
| `tools/sprite-generation/rename-dry-run.ts` | String literals: `/${slug}/${slug}.mjs` migration hints |
| `tools/sprite-generation/js-modules.d.ts` | Ambient declaration comment: legacy `.mjs` typings |
| `tools/sprite-generation/info.test.ts`, `tools/sprite-generation/postprocess/png-region.test.ts` | Historical comments: tests migrated from `.mjs` |
| `tools/tsconfig-toolchain.smoke.test.ts` | Comment: `.mjs` glob / **2gp-y4cn** stitch context |

---

## Notes — `docs/preset-composition-structure-plan` (2026-04-19T17:22:50Z)

Second verification pass before merge to **main**; same acceptance intent as above.

### Critique-and-refine (verdict: **proceed**)

- **Rounds:** 1 (Cursor Task critique-and-refine subagent not invocable in that session; reconciliation applied per `.cursor/agents/critique-and-refine.md` stop criteria on evidence below).
- **Concrete evidence:** `npm run typecheck` OK (no separate `typecheck:tools` in package.json—combined in `typecheck`). `npm run build` OK. `npm test` OK (37 files). `npm run test:e2e` OK after `npx playwright install chromium` (initial failure: missing browser binary at `~/.cache/ms-playwright/...`).
- **Unresolved themes:** none blocking.

### rg gate (`rg '\.mjs\b' tools src --glob '!**/node_modules/**'`)

All hits are allowlisted (no first-party `tools/*.mjs` entrypoints):

- **Upstream URLs / third-party:** `prompt.ts` (falsprite `lib/fal.mjs` on GitHub); `fal.ts` comment (`api/generate.mjs`).
- **Historical / migration comments:** `png-region.test.ts`, `info.test.ts`, `tsconfig-toolchain.smoke.test.ts` (“migrated from .mjs” / Vitest glob note).
- **Prose docs:** `tools/README.md` (documents removal of `tools/**/*.test.mjs` glob).
- **Implementation hints:** `rename-dry-run.ts` (string check for `/${slug}/${slug}.mjs` pattern).
- **Ambient typings:** `js-modules.d.ts` (legacy `.mjs` typings comment).

### package.json

Scripts use `node --experimental-strip-types tools/*.ts`; no references to removed `tools/*.mjs`.
