---
id: 2gp-awrr
status: open
deps: [2gp-04c6]
links: []
created: 2026-03-28T03:23:57Z
type: feature
priority: 1
assignee: user.email
parent: 2gp-c9u6
---
# Add Node script to call fal for raster generation using FAL_KEY

Pin endpoint id; image_size, num_images, png; seed if schema allows. Plan §E.3.1.

## Design

tools/ or scripts/; process.env.FAL_KEY only; no Vite client.

## Acceptance Criteria

1) Clear error if FAL_KEY missing. 2) README/tools README server-side only. 3) Output dir documented. 4) Closure notes pin endpoint id string.

