---
id: 2gp-e9l3
status: open
deps: [2gp-5d4y, 2gp-kp8p]
links: []
created: 2026-03-28T03:23:56Z
type: feature
priority: 0
assignee: user.email
parent: 2gp-gu27
---
# Add GitHub Actions workflow to build and deploy GitHub Pages

push to main → build → deploy; workflow_dispatch. Official Pages actions. Plan §A.2, §A.2.2. Do not deploy from PR.

## Design

checkout@v6, setup-node@v6 node 22 cache npm, upload-pages-artifact@v3 path dist, deploy-pages@v5 id deployment. concurrency group pages; permissions contents read pages write id-token write. configure-pages@v5 optional.

## Acceptance Criteria

1) Valid YAML. 2) build runs npm ci npm run build then upload dist/. 3) Pinned majors match plan. 4) No production deploy on pull_request.

