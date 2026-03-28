---
id: 2gp-3ckw
status: closed
deps: [2gp-awrr, 2gp-fkh5]
links: []
created: 2026-03-28T03:23:57Z
type: chore
priority: 2
assignee: user.email
parent: 2gp-c9u6
---
# Document fal versus OpenAI roles and iteration loop in tools README

**Normative:** **`.cursor/plans/project-implementation-deep-dive.md`** §E.0 (provider split), §E.5.1 (fal↔OpenAI loop and observability).

## Design

Update `tools/README.md` with bullets or a short mermaid diagram; keep one obvious “roles” section.

## Acceptance Criteria

1) `tools/README.md` states **fal** = spritesheet-oriented raster generation (you pack/slice); **OpenAI** = non-fal image gen, vision/QA, and chat, per §E.0. 2) Same doc states **`FAL_KEY`** and **`OPENAI_API_KEY`** **must not** use `VITE_*` and **must not** ship in the GitHub Pages **client** bundle; optional one-liner: after `npm run build`, `rg FAL_KEY dist/` and `rg OPENAI_API_KEY dist/` return nothing. 3) Same doc lists iteration **observability** called out in §E.5.1: **wall-clock time**, **token/cost** line items when the APIs expose them, and **parameter deltas** between fal runs.


## Notes

**2026-03-28T04:08:15Z**

tools/README.md: roles table, mermaid iteration loop, bundle rg checks, observability (wall-clock, usage tokens, fal param deltas), npm script table, openai-vision-qa Chat Completions + policy links.
