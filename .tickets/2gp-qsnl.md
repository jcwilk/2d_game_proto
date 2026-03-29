---
id: 2gp-qsnl
status: open
deps: [2gp-zhra]
links: []
created: 2026-03-29T17:54:41Z
type: task
priority: 3
assignee: user.email
parent: 2gp-sni8
---
# Optional: rename --dry-run subcommand

Optional follow-up after the CLI exists. Implement `rename --dry-run --from <slug> --to <slug>` with a blocklist (`character`, `dpad`, `sprite`, `asset`, `art`, …), validation, and printed migration plan (dirs, renames, candidate string replacements). No `--apply` in MVP. If deferred, close the ticket with a short note explaining deferral (timebox, risk, or superseded by skill-only workflow).

## Acceptance Criteria

- Either: implementation merged with tests covering blocklist and dry-run output shape; or: ticket closed as **deferred** with rationale in the ticket body (not only in comments).

