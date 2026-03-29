---
name: generate-spritesheet
description: >-
  Guides use of the unified sprite-sheet CLI (`npm run generate:spritesheet` /
  `node tools/generate-spritesheet.mjs`) and registry-driven presets under
  `tools/sprite-generation/`. Use when generating or inspecting art for a
  registry asset, adding preset assets, or answering questions about the
  pipeline and manifest contract.
---

# /generate-spritesheet — Unified sprite-sheet CLI

## Purpose

The repo exposes a **single CLI** for registry-backed sprite generation: **`tools/generate-spritesheet.mjs`**, also available as **`npm run generate:spritesheet`**. It runs **`run`** against **`PRESETS`** in **`tools/sprite-generation/presets/registry.mjs`** — run **`list`** to see asset ids. Orchestration, presets, and ADR-style detail live in **`tools/sprite-generation/README.md`**.

**`generate:spritesheet status`:** Prints manifest/sheet presence, mode, and **`stale=`** — git timestamps when available, else **`mtime`**, else **`unknown`** (missing files). See the README opening section for the full staleness rules (untracked / no-git sandboxes).

**`generate:spritesheet info --asset <id>`:** One-asset report: **git-tracked** paths under **`public/art/<id>/`**, on-disk **`manifest.json`** / **`sprite-ref.json`** / **`sheet.png`** sizes (PNG dimensions via IHDR), plus a **loaded preset** summary (frame ids, sheet grid, truncated **`sheetSubject`** / **`frameStyle`** / rewrite prompts). Use **`--no-prompts`** to hide long excerpts. **`--out-base`** matches **`run`** (inspect a non-default output tree).

## Invoke examples

- **Mock (no API keys, deterministic):**

  ```bash
  npm run generate:spritesheet -- run --asset <id> --mode mock
  ```

  Equivalent: **`node tools/generate-spritesheet.mjs run --asset <id> --mode mock`**.

- **Live (fal pipeline):**

  ```bash
  npm run generate:spritesheet -- run --asset <id> --mode live
  ```

- **Inspect one asset (no generation):**

  ```bash
  npm run generate:spritesheet -- info --asset <id>
  ```

  Put **`FAL_KEY`** (or **`FAL_KEY_ID`** + **`FAL_KEY_SECRET`**) in repo-root **`.env`** — the script loads that file automatically when it exists (without overwriting variables already set in the shell). You can still use **`node --env-file=…`** if you need a different file.

## Canonical flags and subcommands

**Do not memorize flags in chat.** The script’s **`--help`** / **`-h`** and **`help`** subcommand are authoritative for flags and commands:

- **`node tools/generate-spritesheet.mjs help`** (or **`--help`** / **`-h`**) — general usage
- **`node tools/generate-spritesheet.mjs help run`** — `run` options (`--asset`, `--mode`, `--out-base`, `--strategy`, …)
- **`help list`**, **`help status`**, **`help info`** — other commands

npm form: **`npm run generate:spritesheet -- help`** (note the **`--`** before **`help`**).

## Rename workflow and slugs

- **Asset ids** are **registry keys** (stable slugs; run **`list`** for current ids). Add or change presets in **`presets/registry.mjs`** and the preset module — avoid ad-hoc or overly generic ids that collide with future assets.
- **Custom output location** without renaming the asset: use **`--out-base <path>`** (absolute or repo-relative) as documented in **`help run`**. Prefer explicit paths over copying outputs by hand so manifests and **`sprite-ref.json`** stay consistent with the preset contract.
