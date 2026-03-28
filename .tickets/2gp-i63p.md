---
id: 2gp-i63p
status: open
deps: [2gp-e9l3]
links: []
created: 2026-03-28T03:23:56Z
type: chore
priority: 2
assignee: user.email
parent: 2gp-gu27
---
# Document GitHub Pages Actions source and first-deploy environment approval

**Normative:** **`.cursor/plans/project-implementation-deep-dive.md`** §A.2.2 (`github-pages` environment), §A.3 (push-driven deploy).

## Design

Add a short **`README.md`** section; optional link to GitHub docs.

## Acceptance Criteria

1) **`README.md`** states **Settings → Pages → Build and deployment → Source: GitHub Actions**. 2) Same doc mentions **first-use** approval for the **`github-pages`** environment if the workflow waits. 3) One sentence: **pushes to the default branch** (e.g. `main`) run the deploy workflow—**describe only**; do **not** instruct agents to merge to `main` as routine work (**`AGENTS.md`**).

