---
name: generate-spritesheet
description: >-
  Guides use of the unified sprite-sheet CLI (`npm run generate:spritesheet` /
  `node tools/generate-spritesheet.mjs`) and registry-driven presets under
  `tools/sprite-generation/`. Use when generating or inspecting dpad or
  character art, adding preset assets, or answering questions about the
  pipeline and manifest contract.
---

# /generate-spritesheet — Unified sprite-sheet CLI

## Purpose

The repo exposes a **single CLI** for registry-backed sprite generation: **`tools/generate-spritesheet.mjs`**, also available as **`npm run generate:spritesheet`**. It runs **`run`** against **`PRESETS`** in **`tools/sprite-generation/presets/registry.mjs`** (e.g. **`dpad`**, **`character`**). Orchestration, presets, and ADR-style detail live in **`tools/sprite-generation/README.md`**.

## Invoke examples

- **Mock (no API keys, deterministic):**

  ```bash
  npm run generate:spritesheet -- run --asset dpad --mode mock
  ```

  Equivalent: **`node tools/generate-spritesheet.mjs run --asset dpad --mode mock`**.

- **Live (fal pipeline — load `.env` for keys):**

  ```bash
  node --env-file=.env tools/generate-spritesheet.mjs run --asset character --mode live
  ```

  Prefer **`node --env-file=.env`** for live runs so **`FAL_KEY`** (or **`FAL_KEY_ID`** + **`FAL_KEY_SECRET`**) comes from **`.env`** without exporting secrets in the shell history.

## Canonical flags and subcommands

**Do not memorize flags in chat.** The script’s **`--help`** / **`-h`** and **`help`** subcommand are authoritative for flags and commands:

- **`node tools/generate-spritesheet.mjs help`** (or **`--help`** / **`-h`**) — general usage
- **`node tools/generate-spritesheet.mjs help run`** — `run` options (`--asset`, `--mode`, `--out-base`, `--strategy`, …)
- **`help list`**, **`help status`** — other commands

npm form: **`npm run generate:spritesheet -- help`** (note the **`--`** before **`help`**).

## Rename workflow and slugs

- **Asset ids** are **registry keys** (stable, non-generic slugs such as **`dpad`**, **`character`**). Add or change presets in **`presets/registry.mjs`** and the preset module — avoid ad-hoc or overly generic ids that collide with future assets.
- **Custom output location** without renaming the asset: use **`--out-base <path>`** (absolute or repo-relative) as documented in **`help run`**. Prefer explicit paths over copying outputs by hand so manifests and **`sprite-ref.json`** stay consistent with the preset contract.
