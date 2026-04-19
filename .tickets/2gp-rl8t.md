---
id: 2gp-rl8t
status: open
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

