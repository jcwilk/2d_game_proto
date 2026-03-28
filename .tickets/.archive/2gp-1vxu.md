---
id: 2gp-1vxu
status: closed
deps: [2gp-swz6, 2gp-xjhm, 2gp-x4js, 2gp-569r, 2gp-9qeh]
links: []
created: 2026-03-28T03:23:56Z
type: feature
priority: 0
assignee: user.email
parent: 2gp-hbb5
---
# Integrate Loader and render at least one Sprite in the main scene

End-to-end Loader → Sprite in scene. **Normative:** **`.cursor/plans/project-implementation-deep-dive.md`** §C.2 (loader path), §A.2.1 (`VITE_BASE` / project Pages URLs).

## Design

Placeholder asset under `public/` (or equivalent); local `npm run dev` and CI-like `npm run build` both exercised. **`VITE_BASE` wiring** is owned by **Configure Vite base and VITE_BASE** (`2gp-569r`) and **Pass VITE_BASE from GitHub Actions** (`2gp-9qeh`); this ticket does **not** re-specify their acceptance—only the checks below.

## Acceptance Criteria

1) Running `npm run dev`, the game shows at least one **static** sprite loaded via Excalibur **`Loader`** on the startup path. 2) `npm run build` with `VITE_BASE=/<your-repo>/` (replace with the real repo segment) **exits 0**. 3) After that build, `rg FAL_KEY dist/` and `rg OPENAI_API_KEY dist/` each return **no matches** (confirms secrets are not bundled—**`.cursor/plans/project-implementation-deep-dive.md`** §E.5.1). 4) Closure notes state whether sprite paths needed fixes beyond sibling tickets `2gp-569r` / `2gp-9qeh`.


## Notes

**2026-03-28T04:02:34Z**

Closure: No path fixes beyond 2gp-569r/2gp-9qeh (publicArtUrl + VITE_BASE unchanged). Added public/art/sample-atlas.png (1x1 PNG) for ImageSource; main scene uses Loader → packed SpriteSheet → Sprite on Actor (center, 64x scale). Build: VITE_BASE=/2d_game_proto/ npm run build exits 0; dist/ has no FAL_KEY or OPENAI_API_KEY substrings.
