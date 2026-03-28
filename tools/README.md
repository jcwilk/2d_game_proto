# Tools (Node / server-side)

Scripts in this directory run **only on the machine or CI that invokes Node** — they are **not** part of the Vite bundle and **must not** be shipped to GitHub Pages. Keep API keys such as **`FAL_KEY`** in environment variables or secret stores; do not embed them in `src/` or client code.

## fal vs OpenAI (roles)

- **fal** — spritesheet-oriented **raster** generation (exact `image_size` where the model allows); this repo’s primary path for atlas-friendly images. Use **`FAL_KEY`**.
- **OpenAI** — non-fal image generation, **vision/QA**, and chat; use **`OPENAI_API_KEY`**. Do not use OpenAI image APIs for the same “spritesheet raster” slot as fal unless the team explicitly changes the plan.

## `fal-raster-generate.mjs`

Calls the fal Model API for text-to-image raster output using **`process.env.FAL_KEY`** only.

- **Endpoint id** (pinned in the script, from the model’s `/api` page): **`fal-ai/flux/dev`**.
- **Writes** generated rasters to **`tools/out/raster/`** by default (`--out-dir` overrides). That directory is gitignored; create it on first run.

Example:

```bash
export FAL_KEY="…"
node tools/fal-raster-generate.mjs --prompt "pixel art hero idle, transparent background" --image-size 512x512 --num-images 1 --output-format png
```

See **`../.cursor/plans/project-implementation-deep-dive.md`** §E.3.1 for `image_size`, `num_images`, `output_format`, and `seed` semantics.

## `png-analyze.mjs`

Deterministic PNG checks for CI and **fal → measure** loops (**§E.5**, **§E.5.1**): width/height, file size, alpha coverage with a **256-bin histogram**, axis-aligned bbox of pixels with alpha **> 0**, and optional **grid projection** vs `--sprite-width` / `--sprite-height` (remainder mod cell size, divisibility, mean luma edge energy on internal grid lines).

**Premultiplied alpha:** If sprites show wrong fringes vs the engine, compare exporter vs Excalibur expectations and fix in **export** or **one** normalization step—see **§C.4** (same checklist this tool supports by surfacing raw alpha distribution and opaque bounds).

**Exit codes:** **0** = success (JSON on stdout). **1** = invalid arguments or missing path (message + `--help` on stderr). **2** = file read error or PNG decode failure.

**Help:** `node tools/png-analyze.mjs --help`

Example (uses checked-in grid fixture):

```bash
node tools/png-analyze.mjs src/art/fixtures/sample-grid-atlas.png --sprite-width 32 --sprite-height 32
```
