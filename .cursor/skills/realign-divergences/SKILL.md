---
name: realign-divergences
description: >-
  Compare behavior to normative specs/*; report gaps and true divergence; file alignment tickets (file-tickets then critique-and-refine on those tickets); optionally work-all. Use when the user says /realign-divergences or wants behavior brought in line with the current spec (including right after a spec edit).
---

# /realign-divergences — Realign code/tests to the spec

Execute **inline** in this thread. Governed by **[HIERARCHICAL_TRUTH_AND_ALIGNMENT_MANDATE.md](../../../HIERARCHICAL_TRUTH_AND_ALIGNMENT_MANDATE.md)** and **[AGENTS.md](../../../AGENTS.md)**. **Truth order** for the slice: **`specs/*`** → **tests** → **code**.

This skill does **not** edit files under **`specs/`**. It **measures** behavior against the **current** written contract and **tracks** implementation/test alignment. Contract edits are out of scope here.

## What you are doing

Usually the user noticed something off, or they **just changed the spec** and want the rest of the repo driven toward it. **Gather evidence** (often in **parallel**), **compare** to **`specs/*`**, then **tickets** only for **real** divergence. **Optional** **`work-all`** at the end—do not inline **`work-next`** / **`verifier`** here.

## Investigation (repeat as needed)

1. **Behavior / implementation** — From the request and conversation (suspect area, surface, repro, logs), decide what to inspect. Spawn **parallel** **Task** subagents with **read-only** / **no-write** instructions to pull code paths, tests, CLI/MCP surfaces, or runtime notes—**narrow** prompts so each subagent returns a **small** report.
2. **Specs** — Read **`specs/*.md`** for the same slice, **prioritizing** anything the first step highlighted. Parallel read-only subagents are fine for **search/read** across large specs.
3. **Another round** — If the picture is still thin, run **1–2** more **investigation** rounds (behavior ↔ spec) before deciding.

**Skills vs agents:** where this file says **Task** → a **`subagent_type`**, do **not** open **`agents/*.md`** and run that workflow inline.

## Compare

- **Aligned** — Spec and observation match. **Stop** (no tickets, no **`work-all`**).
- **Divergence** — The **spec** requires **X** (cite **MUST** / failure / ordering); **observed behavior** is **Y** in a way that **contradicts** X. This is the only case that **grounds alignment tickets** for this skill.
- **Unspecified** — The behavior is **not** covered by normative spec text and is **not** clearly implied from it, **or** the gap is **under-specified**. **Not** a divergence: **do not** treat code as wrong merely because the spec is silent, and **do not** treat “helpful but unspecified” behavior as drift if it **does not contradict** what **is** specified.

For every **unspecified** item worth surfacing, add a short line to the **parent-facing report** with **significance**: how **far** it sits from anything the spec actually commits to (e.g. orthogonal convenience vs. adjacent to a MUST). The parent can **escalate** upstream; this skill **does not** file tickets **only** for unspecified gaps.

If you have **both** true **divergence** and **unspecified** items, file tickets **only** for the divergence; still include the unspecified lines (with significance) in the same parent-facing report.

## Tickets (only after real divergence)

1. **file-tickets (first pass)** — Follow **`.cursor/skills/file-tickets/SKILL.md`** through **step 5** (epic, children, **`./tk dep`**, coverage). **Do not** **`git commit`** yet. **Skip** file-tickets **step 6** in this thread—the next step replaces that review pass.
2. **critique-and-refine** — **Task** (`subagent_type: critique-and-refine`) with a **self-contained** prompt per **`.cursor/agents/critique-and-refine.md`**. The **artifacts** to draft/refine are the **uncommitted** **`.tickets/*.md`** from step 1 (paths and **full text** so the subagent sees stable bytes). **Goal:** improve ticket bodies, acceptance, and deps in place. **After** that loop, complete **file-tickets** **step 7** (commit and push **`.tickets/*.md`** for this batch) unless the user waived commit/push.
3. If **no** tickets were created (fully aligned), **do not** run **`work-all`**.

## Drain (optional)

Invoke the **`/work-all`** skill if the user wants the queue drained.

## Rules

- **No merge to `main`** from this flow unless the user explicitly asked (**AGENTS.md** — **Git branches and `main` (default)**); ticket commits push the **current branch** only.
- **No spec edits** in this flow.
- **Proportionality** — one ticket vs epic + children as warranted.
- Tickets must stay **usable** by **`work-next`** / **`verifier`** (citations to **`specs/*`**, clear acceptance).
