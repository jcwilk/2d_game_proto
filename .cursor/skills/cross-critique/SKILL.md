---
name: cross-critique
description: Runs four parallel read-only Task lanes (same subagent `critiquer`, inherited model) to critique an artifact or decision; the parent pastes a self-contained prompt per lane and reconciles reports into prevalence- and impact-ranked findings. Use for /cross-critique or whenever you want independent parallel critique on correctness, specs, design, or uncommitted changes.
---

# /cross-critique — Parallel critique

**Orchestration:** The **current** agent (parent) spawns **four** **Task** subagents **in one turn** (parallel), each with **`subagent_type: critiquer`** and **`readonly: true`**. The `critiquer` agent uses **`model: inherit`**—do **not** pass Task’s optional **`model`** argument to override it for this workflow.

**Do not** impersonate the critics inline — delegation is the point.

**Critique behavior** (role, read-only rules, report sections, **END CRITIC REPORT**) lives in **[`.cursor/agents/critiquer.md`](../../agents/critiquer.md)**.

**When to use:** User says **`/cross-critique`**; you want **independent** parallel critics before merging a spec change, shipping a sensitive code path, or locking a plan; sanity-checking a **thread conclusion** against `specs/*` and tests; reviewing **working-tree or branch diffs** for drift from the contract. **Not** for ticket hygiene—see **`AGENTS.md`** (critique is separate from `./tk` flows).

## Subagent (four parallel Tasks)

Spawn exactly **four** Task subagents **in one parent message**. Use **`subagent_type: critiquer`** for **each** invocation.

## If critique lanes are unavailable

If the subagents fail to complete for whatever reason:

1. **Stop** the turn.
2. **Tell the user** clearly that parallel critique lanes are not invocable in this session (quote the error if any).
3. **Optional human fallback:** the user runs separate critiques elsewhere and pastes results back for the parent to reconcile—same clustering rules as below, with prevalence labeled **x/n** for however many real reports exist.
4. Do **not** claim success for `/cross-critique` unless **all** lanes successfully produced a report.

## What to put in each Task `prompt`

Each critique Task needs a **self-contained** prompt (critics do **not** see the parent conversation unless you paste it). Use the **same** **evaluation target** and **context pack** for all four; only the **Critic lane id** line must differ per invocation so reports are distinguishable for prevalence (**x/4**).

1. **Critic lane id** — One line, unique per parallel Task (convention: `` `cross-critique-1` `` through `` `cross-critique-4` ``). See **`critiquer`** agent file for the exact section heading and echo rule.
2. **Evaluation target** — What to critique (decision, design, diff summary, plan, spec excerpt, thread conclusion, etc.).
3. **Context pack** — Facts the critics need. **Minimum when the target is a concrete artifact:** include either **verbatim quoted text** (code, spec paragraph, ticket chunk) **or** an unambiguous **repo path** plus **revision** (commit SHA, branch, or “current workspace”) so critics can read the same bytes. Vague summaries alone often produce **agreement on noise**, not on the artifact.

**Example shape (repeat four times with different lane ids):**

```markdown
## Critic lane id
`cross-critique-1`

## Evaluation target
<EVALUATION_TARGET>

## Context (from parent)
<CONTEXT_PACK>
```

## Parent duties after all lanes return

1. **Read** all returned reports (do not cherry-pick one).
2. **Cluster** findings into themes (same underlying issue = one theme).
3. **Prevalence:** For each theme, note how many lanes raised it (**x/k** or **x/4**, per **Partial lane failures**). Treat strong agreement as higher signal unless clearly a shared misconception—if lanes disagree, say so explicitly.
4. **Impact:** When ranking, weight **high-impact** items **and** **widely reported** items toward the **top**. Place **low-impact** or **single-lane** nitpicks **lower** (still list them).
5. **Present to the user** using this **debrief format** (in order):
   - **Brief orientation** — Very short summary of overall results: whether the critique reads as mostly positive, negative, or mixed; whether critics converged on a dominant theme; anything notable about agreement vs disagreement.
   - **Ranked concerns** — Themes ordered by impact and prevalence (still note **x/k** or **x/4** where useful). Use **bullet points**, not a table. Each bullet should focus on **shortcomings, weaknesses, or concerns** (not a separate “what went well” list). When one theme needs extra detail (sub-bullets, edge cases), expand that bullet without forcing the same structure on every item.
   - **Conclusion** — One cohesive synthesis of what the evaluation implies for the target artifact or decision. Mention strengths **only in context** of the overall verdict (e.g. “the core approach is sound, but …”). If there are major flaws, do not give equal weight to minor positives. Aim for a **medium-sized paragraph**, or slightly longer only when nuance is decision-critical. The reader should be able to **act** on this conclusion.
   - Keep full per-lane prose **out of the debrief** unless the user asked for it; offer to paste individual reports if useful.

## Rules

- **Read-only critics** — no ticket closure, commits, or file writes from critique lanes.
- **Parallelism** — Prefer four Task calls in **one** parent message.
- **Proportionality** — If the user’s ask is trivial, shrink the context pack; still run all four lanes.
