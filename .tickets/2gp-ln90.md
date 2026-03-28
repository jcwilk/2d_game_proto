---
id: 2gp-ln90
status: open
deps: []
links: []
created: 2026-03-28T03:23:56Z
type: chore
priority: 3
assignee: user.email
parent: 2gp-gu27
---
# Document Pages published-size and bandwidth limits for maintainers

**Normative:** **`.cursor/plans/project-implementation-deep-dive.md`** §B.5 (Pages quotas, git large files, Actions job duration).

## Design

Add a short section to **`README.md`** or **`MAINTAINERS.md`**—one file only unless you split with closure notes.

## Acceptance Criteria

1) Doc lists: **≤1 GB** published site, **~100 GB/month** soft bandwidth, **10 minute** deploy timeout, **git** large-file **warning/block** thresholds, **Actions** max **job** duration—each with a pointer to §B.5. 2) States GitHub’s **soft “builds per hour”** limit for Pages **does not apply** when using **custom GitHub Actions** (§B.5 table). 3) One sentence: **no** published edge **RPS**; users may see **HTTP 429** when over soft limits.

