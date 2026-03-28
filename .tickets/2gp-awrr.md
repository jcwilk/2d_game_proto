---
id: 2gp-awrr
status: closed
deps: [2gp-04c6]
links: []
created: 2026-03-28T03:23:57Z
type: feature
priority: 1
assignee: user.email
parent: 2gp-c9u6
---
# Add Node script to call fal for raster generation using FAL_KEY

**Normative:** **`.cursor/plans/project-implementation-deep-dive.md`** §E.3.1 (endpoint id, `image_size`, `num_images`, `output_format`, seed).

## Design

Place under `tools/` or `scripts/`; read **`process.env.FAL_KEY`** only. No fal client code or key in `src/` / Vite bundle.

## Acceptance Criteria

1) If **`FAL_KEY`** is unset, the script exits non-zero with a **clear** error. 2) `tools/README.md` states the script is **Node/server-side only** (not bundled to Pages). 3) `tools/README.md` states where raster files are written (directory path). 4) Closure notes record the **exact** fal **endpoint id** string copied from the model’s `/api` page (§E.3.1).


## Notes

**2026-03-28T03:56:06Z**

Endpoint id: fal-ai/flux/dev (from https://fal.ai/models/fal-ai/flux/dev/api). Script: tools/fal-raster-generate.mjs; default output tools/out/raster/; uses @fal-ai/client subscribe; params image_size, num_images, output_format, seed per §E.3.1.
