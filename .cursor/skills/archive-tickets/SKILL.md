---
name: archive-tickets
description: >-
  Move closed tickets to .tickets/.archive/ to keep the active directory
  manageable. Use when the user says /archive-tickets or wants to archive
  old closed tickets.
---

# /archive-tickets — Archive Closed Tickets

Move closed tickets to `.tickets/.archive/` to keep the active directory manageable. The agent performs this workflow directly using file operations — no separate script.

## Procedure

1. **Preview**: List tickets in `.tickets/*.md` whose YAML frontmatter contains `status: closed`. Optionally filter by age (e.g., only tickets modified more than N days ago). Present the list to the user.
2. **On approval**: Create `.tickets/.archive/` if needed. For each closed ticket to archive, `mv` it to `.tickets/.archive/<filename>`. Skip any that fail the age filter if `--older N` was agreed.
3. **Commit**: `git add .tickets/ && git commit -m "archive closed tickets"`.
4. **Push** the **current branch** to **`origin`**; **do not** merge to **`main`** unless the user explicitly asked (**AGENTS.md** — **Git branches and `main` (default)**).
