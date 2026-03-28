---
id: 2gp-kp8p
status: open
deps: [2gp-5d4y]
links: []
created: 2026-03-28T03:23:56Z
type: chore
priority: 1
assignee: user.email
parent: 2gp-gu27
---
# Add repository .gitignore for Node artifacts and secrets

Prevent accidental commits of dependencies, build output, and secrets (including `.env`). Align with plan intro (prototype assets, CI output) and **§E.0** (keys live in `.env`, not in git).

## Design

Ignore node_modules/, dist/, .env, OS junk; extend existing .gitignore if present.

## Acceptance Criteria

1) .gitignore contains node_modules/, dist/, .env. 2) git check-ignore -v .env works when .env exists or equivalent documented.

