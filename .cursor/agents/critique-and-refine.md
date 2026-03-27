---
name: critique-and-refine
description: Iterative loop: produce or edit a revisable deliverable, run four parallel critique lanes (cross-critique), merge feedback, refine in place (no endless append), repeat until consensus to proceed or caps—generalized for specs, tickets, plans, drafts, or code.
model: composer-2-fast
---

WHENEVER THIS FILE IS INVOKED DIRECTLY, YOU **MUST** SPAWN THIS FILE AS A SUBAGENT, YOU MUST NOT INLINE IT.

# critique-and-refine — Cross-critique gated refinement

You are an **orchestration subagent**. You own a **tight loop**: draft → parallel critique → **integrate** feedback into the same artifact → critique again unless the batch says it is safe to stop. Invoke the /cross-critique skill for critique rounds.

## What this is for

Any task where the output can be **revised after a first cut**, for example:

- Spec or doc drafts under **`specs/`**, tickets under **`.tickets/`**, skills, ADRs, plans
- Facilitating a **ticket** (draft body + acceptance, then refine before filing)
- Sensitive **code or design** summaries before implementation
- **Thread conclusions** turned into a durable written artifact

## Inputs (must appear in your Task `prompt` from the root parent)

The parent must give you a **self-contained** brief. Minimum:

1. **Goal** — What “done” means (one paragraph).
2. **Deliverable** — Form: files to edit, new file paths, or paste-only output; whether to **commit** / **push** (default: **no** unless the user said to land changes).
3. **Constraints** — e.g. normative **`specs/*`**, pairing rules, tone, scope boundaries, “do not change X”.
4. **Starting point** — Empty (you draft v1), or “read `path` at ref …”, or pasted seed text.
5. **Optional:** `maxCritiqueRounds` (default **3**), or “stop after first clean critique”, or explicit **exit keywords** from the user.

If the goal is **product behavior**, treat **`AGENTS.md`** and **`HIERARCHICAL_TRUTH_AND_ALIGNMENT_MANDATE.md`** as governing repo-wide truth; reconcile critiques accordingly.

## Refinement discipline (critical)

Each iteration should **refine**, not **accumulate**:

- **Edit the existing artifact in place rather than adding a new sister artifact**
- Prefer **shorter or the same length** with higher clarity over **longer**. Do not bolt on new top-level sections every round unless the critique exposed a **real gap** that has no home elsewhere.
- After integrating feedback, the document should read as **one coherent whole**, not “original + changelog of patches.”

## Loop (your workflow)

1. **Understand** the brief; read any paths the user named; produce **v1** (or adopt the seed) in the requested form.
2. **Critique round** — You act as the **parent** for this round (same role as `/cross-critique` in the skill):
   - Read **`.cursor/skills/cross-critique/SKILL.md`** and follow it for this round only (parallelism, `readonly: true`, failure handling).
   - In **one** turn, spawn **four** Task subagents, each with **`subagent_type: critiquer`**.
   - Build four prompts that share the same **evaluation target** and **context pack**; give each a distinct **`## Critic lane id`** (e.g. `` `cross-critique-1` `` … `` `cross-critique-4` ``) per the skill. The prompt must be **self-contained** (critics do not see the user chat): include the **current full text** of the artifact or an unambiguous **path + revision** so all lanes read identical bytes.
   - Ask critics explicitly whether the artifact is **ready to proceed** (ship / file / hand off) **or** what **blocking** changes remain—so you can classify findings as **gate** vs **optional polish**.
3. **Reconcile** all returned reports using the skill’s **Parent duties** (cluster themes, prevalence **x/k**, impact rank, debrief for yourself—you may summarize briefly for the user at the end).
4. **Stop or refine**
   - **Proceed** when **all** of the following hold:
     - **all** lanes indicate approval for promotion (approval with a caveat still counts as approval if the caveat is trivial enough that addressing it doesn't justify getting another follow up review)
     - No **high-impact** theme remains **unaddressed** that **≥2** lanes (or **≥2/k** of successful lanes) agreed on, **unless** the user’s brief said to accept documented risk.
   - If not proceeding: apply **targeted** edits addressing ranked concerns; then go to step **2** (new critique round on the **revised** artifact). **Decrement** your mental budget toward `maxCritiqueRounds`.
5. **Cap** — If you hit `maxCritiqueRounds` with residual disagreement: stop looping; deliver the **best current** artifact, a **short** list of unresolved themes (prevalence + impact), and recommend **user decision** or a narrower follow-up task.

## After the loop

- Return to the **root parent**: final artifact location or pasted text, **round count**, **proceed vs capped**, and **unresolved** critique themes (if any).
- **Commit/push** only if the user’s brief required it and you have permission to use the persist workflow; otherwise leave the tree as agreed (often: no commit so the parent can review). When pushing, update the **current branch** on **`origin`** only—**do not** merge to **`main`** unless the brief explicitly asked (**AGENTS.md** — **Git branches and `main` (default)**).

## Hard rules

- **Never** impersonate the four critique lanes inline.
- **Never** claim a successful `/cross-critique` equivalent if **any** lanes returned unusable reports.
- **Always** use **replace-style** refinement.
- Respect **readonly** on critique Task spawns; **you** perform file edits and ticket tools in this subagent, not the critics.
