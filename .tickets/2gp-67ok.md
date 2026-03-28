---
id: 2gp-67ok
status: open
deps: [2gp-awrr, 2gp-edpj]
links: []
created: 2026-03-28T03:23:57Z
type: chore
priority: 3
assignee: user.email
parent: 2gp-c9u6
---
# Add package.json script aliases for analyze and generate workflows

Expose `npm run …` entry points for tool CLIs. **Normative:** **`.cursor/plans/project-implementation-deep-dive.md`** §E.3.1 (fal Model API / Node tooling), §E.5 (deterministic analyze scripts), §F (summary).

## Design

Add or update `package.json` `scripts` and `tools/README.md` **together** in the same change so names and paths stay aligned.

## Acceptance Criteria

1) `tools/README.md` documents each analyze/generate command name and the **Node entry file** it runs. 2) `package.json` `scripts` uses **those same names** as keys (closure notes if you rename from examples like `analyze:sprite`). 3) After a normal `npm install`, `npm run` (no script argument) prints the full script list; that list **includes** every name from (2). 4) For each script key from (2), `npm run <key>` executes the path given in `tools/README.md` for that name.

