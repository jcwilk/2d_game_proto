---
id: 2gp-5d4y
status: open
deps: []
links: []
created: 2026-03-28T03:23:56Z
type: task
priority: 0
assignee: user.email
parent: 2gp-gu27
---
# Scaffold Vite TypeScript project with strict compiler options

Create minimal Vite + TypeScript app (package.json, vite.config.ts, index.html, src/main.ts). Align with CONVENTIONS.md. Plan: intro, §F.

## Design

tsconfig.json strict; main.ts entry; Node 22 for local dev to match CI (§A.2.2). No Phaser/Pixi.

## Acceptance Criteria

1) package.json has dev, build, preview; npm run build produces dist/. 2) tsconfig strict; no any in scaffold. 3) README notes Vite-based app (one sentence or link to plan).

