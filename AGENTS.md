# Agents and automation

## Ticket tracker (`wedow/ticket`)

This repo uses **[wedow/ticket](https://github.com/wedow/ticket)** — a git-friendly, markdown-on-disk issue tracker aimed at AI-assisted workflows. Tickets live under **`.tickets/`** as `.md` files with YAML front matter.

- **Run the CLI via `./tk`** — a symlink to **`scripts/ticket`** (the upstream `ticket` script vendored here). That keeps skills and agents aligned on one entry point.
- **Discover commands when you need them:** run **`./tk help`**. Prefer that (or ask in chat) over memorizing or copy-pasting full command lists into docs; upstream evolves, and `./tk help` stays current.
- **Optional:** set **`TICKETS_DIR`** to point at a different tickets directory (see **`.env.example`**). Default is **`.tickets/`** in the repo root.

The copy in **`scripts/ticket`** is MIT-licensed; see **`scripts/ticket-LICENSE.txt`**. To refresh from upstream, replace **`scripts/ticket`** with the latest **`ticket`** script from the [wedow/ticket](https://github.com/wedow/ticket) repository and re-apply any small local patches noted in git history if needed.

## Cursor skills vs `.cursor/agents`

**Skills** (under **`.cursor/skills/`**) are short workflows the main agent follows in this chat.

**Agents** (under **`.cursor/agents/`**) are meant to run **inside Cursor’s Task tool** as isolated subagents — see **`.cursor/skills/spawn-subagent/SKILL.md`**. Do not paste an agent file into the main thread and execute it step by step; that collapses delegation.

## Git branches and `main` (default)

Unless the user explicitly asks otherwise: **commit and push on the current branch only** — do **not** merge into **`main`**, fast-forward **`main`**, or assume releases.

## Environment

**`.env`** for local secrets (e.g. API keys used by optional subagents). **`.env`** is gitignored.
