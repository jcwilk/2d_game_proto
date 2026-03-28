---
id: 2gp-xfhi
status: open
deps: [2gp-5d4y]
links: []
created: 2026-03-28T03:23:56Z
type: task
priority: 0
assignee: user.email
parent: 2gp-2rau
---
# Add Excalibur ^0.32 runtime dependency

Install excalibur@^0.32 stable line not @next. Plan §C.1, §F.

## Design

npm install excalibur@^0.32; lockfile updated.

## Acceptance Criteria

1) package.json has excalibur ^0.32. 2) npm ls excalibur resolves 0.32.x. 3) No @next or prerelease.

