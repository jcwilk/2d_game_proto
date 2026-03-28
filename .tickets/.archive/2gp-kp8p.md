---
id: 2gp-kp8p
status: closed
deps: [2gp-5d4y]
links: []
created: 2026-03-28T03:23:56Z
type: chore
priority: 1
assignee: user.email
parent: 2gp-gu27
---
# Add repository .gitignore for Node artifacts and secrets

Prevent accidental commits of dependencies, build output, and secrets (including `.env`). **Normative:** **`.cursor/plans/project-implementation-deep-dive.md`** intro (prototype/replaceable assets), §E.0 (secrets in `.env`, not in git).

## Design

Ignore `node_modules/`, `dist/`, `.env`, and common OS junk; extend the existing `.gitignore` if one is present.

## Acceptance Criteria

1) `.gitignore` includes patterns that ignore `node_modules/`, `dist/`, and `.env`. 2) With a **temporary** `.env` file present locally, `git check-ignore -v .env` shows a matching rule (or closure notes document an equivalent verification command).

