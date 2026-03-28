# 2D game prototype boilerplate

This repository is a **starting point for small 2D game experiments** where you want a clear place for code, specs, and task tracking, and you plan to use **AI-generated 2D assets** (sprites, tiles, UI) alongside hand-written game logic.

## Intent

- **Prototype-first:** favor a small, understandable layout over a full engine stack until you need it.
- **Assets:** treat generated art as replaceable: keep filenames and sizes stable in code, iterate in your image editor or generator without rewriting gameplay every time.
- **Collaboration with agents:** Cursor skills under **`.cursor/skills/`** and ticket workflows (**`./tk`**, **`.tickets/`**) are set up so planning, implementation, and review can stay structured as the project grows.

## Stack

The app is **Vite + TypeScript** (strict `tsconfig`). Use **Node.js 22** locally to match CI. Run **`npm run typecheck`** to type-check the project with **`tsc --noEmit`** (same files as **`tsconfig.json`** `include`). For build pipeline, caching, and runtime plans, see **`.cursor/plans/project-implementation-deep-dive.md`**.

**Tests:** run **`npm test`** (Vitest). **End-to-end (optional):** **`npm run test:e2e`** runs Playwright against a production preview; the smoke spec asserts **exactly one** `<canvas>` in the DOM (not a golden screenshot). First run may require **`npx playwright install chromium`**. **CI:** **`.github/workflows/pages.yml`** runs **`npm run typecheck`**, **`npm test`**, then **`npm run build`** — it does **not** run **`test:e2e`**.

For **local** development, run **`npm run dev`** with the default **`base: '/'`** (leave **`VITE_BASE`** unset in `.env`). For **GitHub Pages** project URLs (`https://<user>.github.io/<repo>/`), set **`VITE_BASE=/<repo>/`** when building so hashed assets load under that prefix. The **`/<repo>/`** segment must match the **case-sensitive** repository name as it appears in that URL—forks may differ from upstream. Normative detail: **`.cursor/plans/project-implementation-deep-dive.md`** §A.2.1.

**Cache busting:** Vite emits **content-hashed** filenames under **`dist/assets/`** by default (plan **§B.2**), so new deploys reference new chunk URLs. Plan **§B.1** / **§B.4**: expect **eventually consistent** updates, not instant visibility for every user on every network. This prototype does **not** register a service worker or use **`vite-plugin-pwa`** (plan **§B.3**). To confirm hashes track app code: run **`npm run build`**, note the **`dist/assets/*.js`** name, change bundled code under **`src/`**, run **`npm run build`** again—the **`.js`** filename should change.

**Packed atlases (TexturePacker-style JSON):** frame pivots from the export map to **`Sprite.origin`** (or `GetSpriteOptions.origin` when fetching a sprite). Excalibur defaults the origin to the **center** of each sprite graphic—match your atlas tool’s pivot settings to that convention, or override origin per sprite when you build or draw. See **`.cursor/plans/project-implementation-deep-dive.md`** §C.3.

## Docs

- **`AGENTS.md`** — how **`wedow/ticket`** fits in, using **`./tk`**, and repo norms for agents.
- **`CONVENTIONS.md`** — coding conventions for this stack (strict TypeScript, small pure functions).

## Tickets

From the repo root:

```bash
./tk help
```

Copy **`.env.example`** to **`.env`** when you need local API keys or path overrides. For the AI pipeline, set **`FAL_KEY`** and **`OPENAI_API_KEY`** as described in **`.cursor/plans/project-implementation-deep-dive.md`** §E.0.
