---
id: 2gp-j6so
status: open
deps: []
links: []
created: 2026-03-29T03:23:23Z
type: task
priority: 1
assignee: user.email
parent: 2gp-vplr
---
# Phase A: Endpoint abstraction in generators/fal.mjs

Stop assuming every Fal model uses Flux image_size and the same response shape. Introduce an internal map/strategy: endpoint family → { buildInput(ctx), parseResult(data), subscribeOptions }. Refactor falSubscribeToBuffer per plan “Phase A — Endpoint abstraction”: either falSubscribeImageToBuffer with generic subscribe+decode, or one function accepting pre-built input + response adapter.

nano-banana-2 builder: prompt, aspect_ratio "4:1", resolution (e.g. 1K—validate vs fal OpenAPI), num_images: 1, output_format png, optional seed. Flux builder: preserve current behavior for backward compatibility and A/B.

Authority: tools/sprite-generation/FALSPRITE_INTEGRATION_PLAN.md § Phase A, § Target stack, § References (OpenAPI).

## Design

- Centralize parse in one function; test with fixture JSON if response shape differs (plan “Risks”: response shape).
- Horizontal sheet uses aspect_ratio "4:1" — not "1:4" (plan “Minimal port”).

## Acceptance Criteria

- Unit or integration test with mock falSubscribe asserts the input object for fal-ai/nano-banana-2 contains aspect_ratio and resolution, not only image_size (plan Phase A acceptance).
- Flux path still builds legacy-shaped input when using flux/dev (or current default) — evidenced by existing or new test/fixture.
- Verifier: primary gate is an automated test that satisfies the plan Phase A acceptance (mock asserts nano-banana input includes `aspect_ratio` and `resolution`, not only `image_size`). Secondary: Flux regression coverage; the test must live under a committed path and run via an npm script wired in CI (existing or added for sprite-generation).

