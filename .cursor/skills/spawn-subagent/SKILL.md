---
name: spawn-subagent
description: Explicitly launches Cursor Task subagents from `.cursor/agents/*.md` via the Task tool—never inline mimicry. Use when the user says `/spawn_subagent`, references this skill, or `@`-mentions an agent definition and wants real delegation. Supports serial (default) or parallel multi-spawn when multiple agents or slash invocations are requested.
---

# /spawn_subagent — Delegate to Task subagents

**Purpose:** When this skill applies, the **current** agent **must** spawn the requested workflow using the **Task** tool with the matching **`subagent_type`**. **Do not** open **`.cursor/agents/<name>.md`** and execute its steps in this thread—that collapses delegation and breaks isolation (see **`AGENTS.md`**, Skills vs agents).

## Map path to Task

- **`.cursor/agents/<stem>.md`** → **`subagent_type`**: **`<stem>`** (filename without `.md`, e.g. `verifier`, `work-next`, `critique-and-refine`, `spec-change`, `critiquer`).
- Pass a **self-contained** `prompt` so the subagent can complete without relying on unstated parent context; paste any needed context, file paths, ticket ids, or user goals into that prompt.

## Triggers

- User says **`/spawn_subagent`** (with or without **`@`** paths).
- User **`@`**-references **`agents/*.md`** and intent is clearly “run that agent,” not “summarize this file.”

## Multiple agents or repeated slash commands

| Situation | Behavior |
|-----------|----------|
| **Default** | **Serial:** one Task at a time; wait for each subagent to finish before starting the next. Applies when the user chains several **`/spawn_subagent`** lines, lists multiple **`@`** agent paths without parallel wording, or says “then” / “after that.” |
| **Parallel** | **Only** when the user explicitly asks for parallel execution (e.g. “in parallel,” “concurrently,” “at the same time,” “parallel spawn”). Then issue **multiple Task calls in one parent turn**—one per requested agent—with the same rules as other parallel subagent workflows (e.g. **`cross-critique`**). |

If intent is ambiguous, **default to serial** and briefly state that choice.

## If Task / subagents are unavailable

1. **Stop** the delegation attempt for that spawn.
2. **Tell the user** clearly (quote errors if present).
3. **Do not** substitute by impersonating the agent inline unless the user **explicitly** waives subagent delegation.

## Anti-patterns (do not)

- Reading **`agents/*.md`** and replaying its procedure in the parent chat.
- Skipping Task because the parent “already knows” what the agent would do.
