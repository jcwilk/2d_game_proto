---
id: 2gp-edpj
status: closed
deps: [2gp-1voe, 2gp-04c6]
links: []
created: 2026-03-28T03:23:57Z
type: feature
priority: 1
assignee: user.email
parent: 2gp-c9u6
---
# Add deterministic PNG analysis script (dimensions, alpha, grid projection)

**Normative:** **`.cursor/plans/project-implementation-deep-dive.md`** §E.5 (deterministic checks), §E.5.1 (metrics), §C.4 (premultiplied alpha note when relevant).

## Design

Use `sharp`, `pngjs`, or similar; CLI accepts image path + grid parameters. Wire to `npm run` via **Add package.json script aliases** (`2gp-67ok`) when that lands, or document the raw `node` command until then.

## Acceptance Criteria

1) Script runs successfully on at least one **checked-in** fixture PNG and prints dimensions / alpha / grid-projection metrics defined in §E.5.1. 2) **Either** Vitest tests cover the pure metric functions **or** `tools/README.md` documents CLI **exit codes** (0 = success, non-zero on failure) and `--help` output. 3) `tools/README.md` mentions the **alpha** / premultiplied checklist tie-in from §C.4 where relevant.

