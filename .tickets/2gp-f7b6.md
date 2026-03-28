---
id: 2gp-f7b6
status: open
deps: [2gp-b4lm]
links: []
created: 2026-03-28T16:21:10Z
type: chore
priority: 2
assignee: user.email
parent: 2gp-3y3y
---
# sprite-gen: verify mock parity

Verify **`mock:dpad-workflow`** output matches **pre-refactor** behavior. **Baseline:** git **parent commit**, **stash**, or — if the workspace has **no git history** — a **saved baseline** (e.g. zip or folder of PNGs + JSON artifacts) whose path/hash is recorded in the close note. Compare: PNG dimensions and alpha behavior, **`manifest.json`** fields (including **`recipeId`** / **`generationRecipe`** where applicable), **`png-analyze`** sidecar metrics, **sprite-ref** JSON.

**Equivalence surface:**

- **`npm run mock:dpad-workflow`** (same as **`node tools/dpad-workflow.mjs --mode mock`**).
- **`node tools/mock-dpad-workflow.mjs`** with representative args — must match direct **`dpad-workflow`** invocation (**spawn parity**).

Use **byte compare** or **SHA-256** of PNGs **if deterministic**; if timestamps or non-deterministic fields differ, list **allowed deltas** explicitly.

## Acceptance criteria

- [ ] Close note documents **verification commands**, **baseline revision**, and **pass/fail criteria**.
- [ ] Any **intentional** delta vs legacy (e.g. **`recipeId`** format change) is **listed explicitly** and signed off in the note.
- [ ] **No fal** / **no live API** — mock only.
