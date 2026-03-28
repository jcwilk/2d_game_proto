---
id: 2gp-e9l3
status: closed
deps: [2gp-5d4y, 2gp-kp8p]
links: []
created: 2026-03-28T03:23:56Z
type: feature
priority: 0
assignee: user.email
parent: 2gp-gu27
---
# Add GitHub Actions workflow to build and deploy GitHub Pages

**Normative:** **`.cursor/plans/project-implementation-deep-dive.md`** §A.2 (two-job pattern), §A.2.2 (permissions, `github-pages` environment). **Do not** deploy production from `pull_request`.

## Design

Use **`actions/checkout@v6`**, **`actions/setup-node@v6`** (Node **22**, `cache: npm`), **`actions/upload-pages-artifact@v3`** (`path: dist`), **`actions/deploy-pages@v5`** (`id: deployment`). **`concurrency:`** group `pages`, `cancel-in-progress: false`. **`permissions:`** `contents: read`, `pages: write`, `id-token: write`. Optional: **`actions/configure-pages@v5`**.

## Acceptance Criteria

1) Workflow YAML parses and matches the §A.2.2 **shape** (build + deploy jobs). 2) **`build`** runs `npm ci` then `npm run build` then uploads **`dist/`**. 3) Action **major** versions match **`.cursor/plans/project-implementation-deep-dive.md`** §A.2.2 / §F (re-verify on bump). 4) No job that publishes Pages runs on **`pull_request`** (fork PRs must not deploy).

