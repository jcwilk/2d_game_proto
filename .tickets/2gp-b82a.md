---
id: 2gp-b82a
status: open
deps: [2gp-zhra]
links: []
created: 2026-03-29T17:54:41Z
type: task
priority: 2
assignee: user.email
parent: 2gp-sni8
---
# Skill and documentation pointers

Add .cursor/skills/generate-spritesheet/SKILL.md (YAML frontmatter: name, description). Body: purpose, invoke examples (node --env-file=.env for live), --help canonical, rename workflow guidance (non-generic slugs). Short pointers in tools/sprite-generation/README.md; optional AGENTS.md pointer.

## Acceptance Criteria

- `.cursor/skills/generate-spritesheet/SKILL.md` exists with YAML frontmatter `name` and `description` consistent with other skills in `.cursor/skills/` (third-person, what + when).
- Body references `node --env-file=.env` for live runs and states script `--help` is canonical for flags.
- `tools/sprite-generation/README.md` links the skill and `generate:spritesheet` / CLI path without duplicating full flag lists.
- If `AGENTS.md` is updated, it is a one-line pointer only (optional per ticket scope).

