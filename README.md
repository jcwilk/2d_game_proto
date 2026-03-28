# 2D game prototype boilerplate

This repository is a **starting point for small 2D game experiments** where you want a clear place for code, specs, and task tracking, and you plan to use **AI-generated 2D assets** (sprites, tiles, UI) alongside hand-written game logic.

## Intent

- **Prototype-first:** favor a small, understandable layout over a full engine stack until you need it.
- **Assets:** treat generated art as replaceable: keep filenames and sizes stable in code, iterate in your image editor or generator without rewriting gameplay every time.
- **Collaboration with agents:** Cursor skills under **`.cursor/skills/`** and ticket workflows (**`./tk`**, **`.tickets/`**) are set up so planning, implementation, and review can stay structured as the project grows.

## Stack

The app is **Vite + TypeScript** (strict `tsconfig`). Use **Node.js 22** locally to match CI. For build pipeline, caching, and runtime plans, see **`.cursor/plans/project-implementation-deep-dive.md`**.

For **local** development, run **`npm run dev`** with the default **`base: '/'`** (leave **`VITE_BASE`** unset in `.env`). For **GitHub Pages** project URLs (`https://<user>.github.io/<repo>/`), set **`VITE_BASE=/<repo>/`** when building so hashed assets load under that prefix. Normative detail: **`.cursor/plans/project-implementation-deep-dive.md`** §A.2.1.

## Docs

- **`AGENTS.md`** — how **`wedow/ticket`** fits in, using **`./tk`**, and repo norms for agents.
- **`CONVENTIONS.md`** — coding conventions for this stack (strict TypeScript, small pure functions).

## Tickets

From the repo root:

```bash
./tk help
```

Copy **`.env.example`** to **`.env`** when you need local API keys or path overrides. For the AI pipeline, set **`FAL_KEY`** and **`OPENAI_API_KEY`** as described in **`.cursor/plans/project-implementation-deep-dive.md`** §E.0.
