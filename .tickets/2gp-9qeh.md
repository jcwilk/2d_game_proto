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

CI injects base path for Pages. Plan §A.2.1, §B.2.

## Design

env on build step: VITE_BASE=/repo/ using github.event.repository.name or documented. No FAL_KEY/OPENAI in client.

## Acceptance Criteria

1) Workflow sets VITE_BASE on npm run build. 2) README documents repo name case for forks.

