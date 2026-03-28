---
id: 2gp-eaer
status: open
deps: [2gp-swz6, 2gp-1voe]
links: []
created: 2026-03-28T03:23:57Z
type: chore
priority: 3
assignee: user.email
parent: 2gp-9buv
---
# Add optional Playwright smoke test for canvas presence

**Normative:** **`.cursor/plans/project-implementation-deep-dive.md`** §D.4 (optional Playwright smoke—**not** AI-driven browser control).

## Design

`test:e2e` npm script; Playwright uses **one** Chromium project. Whether the smoke runs in **CI** is documented explicitly (this ticket does **not** require wiring into **Integrate typecheck and tests** `2gp-ufvb` unless you choose to—say which in closure notes).

## Acceptance Criteria

1) `playwright.config.*` defines **exactly one** browser project (e.g. Chromium). 2) One test asserts **≥1** canvas in the DOM **or** compares one **golden** screenshot—state which in `README.md`. 3) `README.md` documents `npm run test:e2e` and whether CI runs it (yes/no and where).

