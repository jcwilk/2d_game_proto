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

One Chromium project; canvas or one golden screenshot. Plan §D.4. Not AI-driven browser.

## Design

test:e2e script; document CI vs local in README.

## Acceptance Criteria

1) Playwright config single project. 2) One test canvas≥1 or screenshot baseline stated in README. 3) README documents npm run test:e2e and CI behavior.

