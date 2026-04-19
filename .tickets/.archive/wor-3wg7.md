---
id: wor-3wg7
status: closed
deps: [wor-rfpz]
links: []
created: 2026-04-19T16:37:36Z
type: task
priority: 2
assignee: Cursor Agent
parent: wor-isz6
---
# Refactor avatar-character preset to use character factory + defaults

## Design

Wire avatar-character.ts to character-preset + character-defaults; remove duplicated strip crop math and redundant fal literals where replaced by lib. Preserve KIND, frames ids, prompt identity, recipeId behavior.

## Acceptance Criteria

avatar-character passes existing preset tests; mock generate unchanged vs prior geometry; pipeline/registry tests green.

