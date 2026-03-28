---
id: 2gp-9qeh
status: open
deps: [2gp-569r, 2gp-e9l3]
links: []
created: 2026-03-28T03:23:56Z
type: task
priority: 1
assignee: user.email
parent: 2gp-gu27
---
# Pass VITE_BASE from GitHub Actions build job

CI sets the public base path for project Pages URLs. **Normative:** **`.cursor/plans/project-implementation-deep-dive.md`** §A.2.1 (`VITE_BASE`), §B.2 (hashed assets under that base).

## Design

On the **build** step, set `VITE_BASE=/<repo>/` using `github.event.repository.name` (or equivalent) so forks get the right path. **Never** inject `FAL_KEY` or `OPENAI_API_KEY` into the client build.

## Acceptance Criteria

1) The workflow passes **`VITE_BASE`** into the environment for **`npm run build`** (or the documented build command). 2) **`README.md`** explains that **`VITE_BASE`** must match the **case-sensitive** repo segment in `https://<user>.github.io/<repo>/` (forks may differ).

