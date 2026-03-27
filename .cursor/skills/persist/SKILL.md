---
name: persist
description: Commit and push changes relevant to the current conversation context.
disable-model-invocation: true
---

# Persist Changes 💾

Commit and push the changes in the repo that are **relevant to the current context** of this conversation. Do not commit unrelated or stray changes.

## Workflow

1. **Identify relevant changes**: Review the conversation and `git status`. Determine which modified/untracked files are part of the work discussed in this session. Ignore files that are clearly unrelated (e.g. accidental edits, debug output, personal config).

2. **Resolve ambiguity**: If it's unclear which files to include (e.g. multiple unrelated changes, or you're unsure whether a file belongs to this context), **ask the user for clarification** before committing. Do not guess.

3. **Stage and commit**: Stage only the relevant files. Write a clear, descriptive commit message (see **Commit messages** below). Commit.

4. **Push**: Push to the remote branch.

5. **Post-commit check**: After pushing, run `git status` again. If there are **any uncommitted changes** (modified, untracked, or staged-but-not-committed):
   - **Warn clearly**: List the unchecked files and state that they were not committed.
   - **Assess**: Only treat this as acceptable if it seems **expected from context** (e.g. user said "commit just the rl changes", or `.env` is intentionally gitignored, or user explicitly asked to leave something out). Otherwise, explicitly flag it as a concern and ask whether those files should be committed or discarded.

## Commit messages

Be **explicit and verbose**. Optimize for both GitHub and agentic usage.

- **Subject line** (first line): Imperative mood, ~50 chars. Summarize *what* changed, not how. Example: `Align rl cost env vars to CLOUDFLARE_*` not `Fix env vars`.
- **Body**: Add context when helpful — *why* the change was made, what problem it solves, or what was considered. GitHub renders the body in commit and PR views; agents use it to trace activity.
- **Ticket references**: If the work relates to a ticket (e.g. from `./tk`), include the ID in the subject or body. Example: `til-abc1` or `(til-abc1)`. This helps agents and humans link commits to tickets.
- **Issue/PR linking**: Use `Fixes #123` or `Refs #123` in the body when relevant; GitHub will auto-link.
- **Avoid**: Vague messages like "fix stuff", "updates", "WIP". Prefer messages that stand alone without reading the diff.

## Rules

- **Current branch only:** Push updates **`origin/<current-branch>`**. **Do not** merge into **`main`** or fast-forward **`main`** unless the user explicitly asked (**AGENTS.md** — **Git branches and `main` (default)**).
- **No force push** unless the user explicitly requests it.
- **No committing secrets** — if any staged file might contain secrets, stop and ask.
- **Scoped commits**: Prefer one logical commit per context. If the conversation covered multiple distinct changes, you may split into multiple commits with clear messages, or ask the user.
- **Clean staging**: Do not stage `.env`, `node_modules`, build artifacts, or other gitignored/irrelevant files.
