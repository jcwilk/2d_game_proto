---
id: 2gp-zxol
status: open
deps: []
links: []
created: 2026-03-29T18:47:57Z
type: epic
priority: 1
assignee: user.email
---
# Epic: Decouple asset slug references from registry, CLI, tests, loaders

Refactor so adding/removing/renaming a sprite asset only needs changes under presets/<slug>/ plus the one game call site that wires that asset (today: walk cycle in main.ts). Remove hard-coded asset slugs from shared infrastructure except intentional gameplay wiring.

Canonical plan: .cursor/plans/decouple_asset_slug_references_10d7239e.plan.md (gitignored locally; see repo plan doc if synced).

Out of scope: per-preset unit tests under presets/<slug>/ may keep preset-specific imports.

