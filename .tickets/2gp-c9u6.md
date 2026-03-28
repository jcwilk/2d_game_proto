---
id: 2gp-c9u6
status: open
deps: []
links: []
created: 2026-03-28T03:23:56Z
type: epic
priority: 2
assignee: user.email
---
# Epic: AI & tooling pipeline

fal raster scripts, deterministic PNG analysis, optional OpenAI vision; `.env.example`. Canonical plan §E.

**Scheduling note:** Child tickets depend on **Add repository .gitignore** (`2gp-kp8p`) and **Add Vitest** (`2gp-1voe`) where applicable—land infra/testing prerequisites first. **Secrets and provider calls stay in Node tooling only**—never `VITE_*` public env keys for `FAL_KEY` / `OPENAI_API_KEY`, never committed `.env` values.

