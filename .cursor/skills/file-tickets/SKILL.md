---
name: file-tickets
description: >-
  Create tickets from the conclusion of the current conversation. Use when
  the user says /file-tickets or wants to turn agreed plans into tickets.
---

# /file-tickets — Create Tickets from Conversation

Turn the **conclusion of the current conversation** into a structured set of tickets. This is a filing-only workflow — do not implement any of the work described.

## Procedure

1. **Extract the conclusion**: Review the conversation. Identify what was agreed, planned, or outlined. Summarize before proceeding.
   - Identify any authoritative markdown spec(s) that govern the behavior—the applicable governing area spec(s) under **`specs/`** (placeholder: **`specs/<slice>.md`**); use **[specs/README.md](../../specs/README.md)** for the slice hub and **[tests/README.md](../../tests/README.md)** for harness and execution context when helpful.
2. **Create an epic**:
   ```
   ./tk create "Epic: <short title>" -t epic -d "<summary>"
   ```
   Note the epic ID.
3. **Break into child tickets**: For each distinct piece of work:
   ```
   ./tk create "Title" --parent <epic-id> -d "<description>" [--design "..."] [--acceptance "..."] [-t feature|task|bug|chore] [-p 0-4]
   ```
   - Write ticket content with high parity to the conversation's agreed source material; avoid unnecessary rewording.
   - If a behavior is defined in authoritative markdown, cite that file path in the ticket description/design and treat it as canonical.
   - Include enough detail in `description`/`design`/`acceptance` so `.cursor/agents/work-next.md` can complete the ticket in isolation.
   - Include concrete acceptance criteria and expected evidence so `.cursor/agents/verifier.md` can definitively assess whether the proposed changes satisfy the ticket.
4. **Model dependencies**: This is critical.
   - `./tk dep <id> <dep-id>` — `id` cannot start until `dep-id` is closed.
   - Run `./tk dep cycle` to verify no cycles.
5. **Verify coverage**: Walk through the conclusion and confirm every item maps to at least one ticket.
6. **Pre-commit ticket review (subagent pass)** — **before** staging or committing:
   - **Goal:** Catch scope gaps, sibling-ticket conflicts, weak acceptance criteria, and dependency-order mistakes while tickets are still mutable.
   - **Spawn one read-only subagent per ticket** in this filing batch (epic + each child). Use a **Task**-style subagent or equivalent with **read-only** / no-write instructions.
   - **Shared context** for every subagent (copy in the prompt): (a) the **conversation conclusion** and any **verbatim user constraints** that shaped the filing; (b) a **request / conversation id** if the user supplied one; (c) a **compact map of all tickets** in the batch (id, title, type, `deps`); (d) the **full text** (or `./tk show <id>` output) of the **one ticket that subagent is assigned to evaluate**.
   - **Subagent rules:** **Do not** edit `.tickets/*.md` or run `./tk` mutating commands. **Report only:** structured findings—gaps vs user intent, conflicts with other tickets in the batch, whether **deps** supply everything this ticket needs before it runs and whether it sets up downstream tickets, mis-structured scope, and **concrete** suggested description/acceptance/dep changes (wording only).
   - **Parent agent:** When all subagents return, **reconcile** their reports (merge overlapping advice, resolve tensions, decide what to adopt). Apply updates by editing `.tickets/*.md` and/or `./tk dep` / `./tk undep` as needed. Re-run `./tk dep cycle` after dep changes.
   - **Proportionality:** If the batch is a **single** ticket (no epic children), the **parent** may run the **same evaluation checklist** inline instead of spawning a subagent—still **before** commit.
7. **Commit and push** (pick **one** path):
   - **Default (/file-tickets from conversation only):** Stage **only** the new or updated `.tickets/*.md` files from this filing (including edits from step 6). Commit as a group (e.g., `Add epic <id>: <title>` or `Refine tickets for epic <id>`). Push the **current branch** to remote—**do not** merge to **`main`** unless the user explicitly asked (**AGENTS.md** — **Git branches and `main` (default)**).
   - **Bundled planning commit** (e.g. **`/spec-change`** via **Task** → **`spec-change`**, **`.cursor/agents/spec-change.md`**): When `specs/*` and/or `HIERARCHICAL_TRUTH_AND_ALIGNMENT_MANDATE.md` must land in the **same** commit as the new tickets, run steps **1–6** in full, then **do not** commit tickets alone. Stage those spec/mandate files **together with** the `.tickets/*.md` from this filing in **one** commit (still **no** implementation code or test changes). **After** any **verifier** gate required by that flow, push once for that bundle on the **current branch** (same **`main`** rule as above). This keeps “spec + alignment tickets only” shape while preserving the pre-commit review.

## Rules

- **Filing only** — do not run `./tk start`, write code, or make changes beyond `.tickets/*.md` (step 6 may **edit tickets only** after subagent review).
- **Subagent review is part of filing** — step 6 runs **before** the commit in step 7; skipping it defeats the purpose unless the user explicitly waives it.
- Prefer smaller, focused tickets over large monolithic ones.
- Use `--parent` to group under the epic. Use `dep` for ordering constraints.
- Types: `-t feature` (new capability), `-t task` (implementation work), `-t chore` (maintenance), `-t bug` (fix).
- **Truth precedence:** authoritative markdown specs > tests > code. Never file tickets that drift from authoritative markdown unless the user explicitly requests a spec change.
