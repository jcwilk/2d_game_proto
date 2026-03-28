---
id: 2gp-f7b6
status: closed
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

- [x] Close note documents **verification commands**, **baseline revision**, and **pass/fail criteria**.
- [x] Any **intentional** delta vs legacy (e.g. **`recipeId`** format change) is **listed explicitly** and signed off in the note.
- [x] **No fal** / **no live API** — mock only.

## Notes

**2026-03-28T16:39:54Z**

## Mock parity verification (2026-03-28)

**Baseline revision:** `cca47cba1ea5b92dec921289d4abac7b10b53142` (git parent of `eb2885c4e2197a15e0270db6a506a0fc32595682`; message: "Add dpad sprite-gen preset (createPreset) and wire pipeline tests (2gp-mwst)").

**Method:** Two detached `git worktrees` on baseline vs HEAD, `npm ci`, then `npm run mock:dpad-workflow` in each (mock only; no FAL_KEY, no network to fal). Removed worktrees after comparison.

**Commands (repeatable):**
```bash
git worktree add /tmp/dpad-parity-baseline cca47cb
git worktree add /tmp/dpad-parity-head eb2885c
( cd /tmp/dpad-parity-baseline && npm ci && npm run mock:dpad-workflow )
( cd /tmp/dpad-parity-head && npm ci && npm run mock:dpad-workflow )
# Pairwise SHA-256 of public/art/dpad/{up,down,left,right}/dpad.png — all four matched across trees.
sha256sum /tmp/dpad-parity-baseline/public/art/dpad/*/dpad.png
sha256sum /tmp/dpad-parity-head/public/art/dpad/*/dpad.png
# png-analyze sidecars: `diff -q` identical for all four frames.
# Spawn parity (HEAD): `node tools/mock-dpad-workflow.mjs --quiet` then `node tools/dpad-workflow.mjs --mode mock --quiet` — same SHA-256 for up/dpad.png after each run (b39614bd41d53fcbb135dbb6696c0c00b180deee12e022f8973938d8a15f3bec).
```

**Pass/fail criteria used:** PASS if all mock PNGs byte-match baseline; png-analyze JSON byte-match; manifest `recipeId` and mock `generationRecipe` semantics match; ALLOWED deltas only for `createdAt` and per-frame `wallMs` timing noise.

**Results:** PASS. All four PNGs SHA-256-identical to baseline. All four `png-analyze.json` files byte-identical. `recipeId` unchanged: `sprite-gen-dpad_four_way-mock-v2-frames` (no recipeId format change).

**Allowed deltas:** `manifest.json` differs only in `createdAt` and small `wallMs` integer differences (e.g. 9 vs 10 ms) due to pipeline ordering/timing.

**Intentional delta vs legacy monolith:** Post-refactor `runPipeline` writes `public/art/dpad/sprite-ref.json`; the pre-refactor `dpad-workflow.mjs` did not emit sprite-ref. Signed off as expected pipeline artifact; PNG/manifest/png-analyze parity preserved.

**No fal / no live API** — verification used `--mode mock` only.
