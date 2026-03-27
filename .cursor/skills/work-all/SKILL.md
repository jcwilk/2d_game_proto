---
name: work-all
description: >-
  Batch-process all ready tickets one by one; after a successful drain,
  archive closed tickets (see archive-tickets skill). Use when the user
  says /work-all or wants to process all available tickets sequentially.
---

# /work-all — Batch-Process All Ready Tickets

Orchestration only: for each item **`./tk ready`** lists, spawn **`work-next` once** and verify the repo is done before the next iteration. Do **not** implement tickets, run verifier, persist, or mimic `.cursor/agents/work-next.md` in this turn—delegate that to **`work-next`**.

**Queue:** Work-all drains a queue that is already valid in the tracker. When **`./tk ready`** is empty: if you **never** completed a full ticket cycle (steps 3–5) in this run, **stop** and report that there are no ready tickets (or no more, if you already finished some). If you **did** complete at least one full cycle, the queue is drained—continue to **When `./tk ready` is empty** below (including **Archive** when applicable). You may add **one short** note if something looks wrong with the queue (e.g. open tickets all blocked) and **offer** to fix it **if the user wants**—do **not** edit ticket files, deps, or tk metadata unprompted to “create” ready work.

**Re-fetch:** Before **each** new ticket, run `./tk ready` again; do not assume the previous list is still right.

## Procedure

1. `./tk ready`
2. If **none** → apply **Queue** above: if you have **not** yet completed steps 3–5 for any ticket in this run, stop and report (no **Archive**). Otherwise the batch drained successfully—continue with **When `./tk ready` is empty** below.
3. Pick **one** ticket (stable order, e.g. first line).
4. **Spawn `work-next`:** Cursor **Task** tool, `subagent_type: work-next`; prompt includes the ticket id and `.cursor/agents/work-next.md`.
5. Confirm: `./tk show <id>` closed, `git status` clean, recent commit, **current branch** pushed if ahead (**do not** merge to **`main`** unless the user explicitly asked—**AGENTS.md** — **Git branches and `main` (default)**). If that fails, clean up only fallout from **that** subagent run (commit/close/push as needed), then either **resume from step 1** or, if stuck or you must end the run, **exit** and summarize. **Exit** here (unrecoverable / user halt / stuck) is a **batch abort**—do **not** run **Archive** later in this run.
6. Go to step 1.

### When `./tk ready` is empty

Use this block when step 2 sent you here (queue empty **after** at least one successful steps 3–5 cycle in this run). Proceed to **Archive** below, then summarize.

### Archive (successful batch only)

Perform this block only when you arrived via **When `./tk ready` is empty** above (successful drain, no batch abort).

1. Read and follow `.cursor/skills/archive-tickets/SKILL.md`. For that skill’s preview/approval: listing closed tickets in `.tickets/*.md` is still useful for the final summary; **successful completion of this `/work-all` run is the approval** to move them—perform the moves, commit, and push per the archive skill **without** waiting for a separate user confirmation round.
2. If there are **no** closed tickets left in `.tickets/*.md` to archive, skip moves/commit/push for archiving and say so in the summary.

Then summarize what completed (including anything archived).

## Rules

- **Sequential only**; one `work-next` per ticket, no parallel workers.
- **Do not call `verifier`** here; `work-next` owns it.
- **Orchestrator cleanup** is for after a subagent run left bad git/ticket state—not for an empty `ready` list before any subagent ran.
- **Archive** runs **only** after a **successful** full batch as above—never after abort, stuck state, or a no-op run (empty `ready` on the first check).
