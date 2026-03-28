---
id: 2gp-c9u6
status: closed
deps: []
links: []
created: 2026-03-28T03:23:56Z
type: epic
priority: 2
assignee: user.email
---
# Epic: AI & tooling pipeline

fal raster scripts, deterministic PNG analysis, optional OpenAI vision; `.env.example`.

## Design

**Scheduling:** Child tickets depend on **Add repository .gitignore** (`2gp-kp8p`) and **Add Vitest** (`2gp-1voe`) where their YAML `deps` state so—land those prerequisites first.

## Epic rollup (definition of done)

**Close this epic** only when no child ticket with `parent: 2gp-c9u6` remains **open**. **Secrets / bundle rules** are enforced by child tickets (e.g. `.gitignore`, `tools/README`, CI)—**normative** reference: **`.cursor/plans/project-implementation-deep-dive.md`** §E (especially §E.0, §E.5.1).

## Acceptance Criteria

1) Rollup above is satisfied at closure.


## Notes

**2026-03-28T04:08:16Z**

Epic rollup: all children closed. Added openai-vision-qa.mjs, npm scripts (generate:raster, analyze:png, qa:vision), expanded tools/README (roles, loop, observability, bundle checks). .env.example OPENAI_VISION_MODEL placeholder.
