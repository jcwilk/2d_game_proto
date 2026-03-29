---
id: 2gp-xkds
status: closed
deps: [2gp-j6so]
links: []
created: 2026-03-29T03:23:23Z
type: task
priority: 2
assignee: user.email
parent: 2gp-vplr
---
# Phase B: Optional LLM rewrite (openrouter/router)

Optional step before sheet generation, driven by preset or CLI flag. New helper e.g. rewritePromptViaOpenRouter({ userPrompt, systemPrompt, model, temperature, maxTokens }) calling fal.subscribe("openrouter/router", { input: { ... } }) per FalSprite call pattern; one FAL_KEY.

Wire only into sheet path first: buildSheetPrompt output → rewrite → nano-banana input prompt. Default off for dpad M1 if using frozen preset prompt file; enable for iteration.

Authority: tools/sprite-generation/FALSPRITE_INTEGRATION_PLAN.md § Phase B, § Target stack step 1.

## Design

- Never log full prompt text at INFO; use hashPromptForLog from generators/fal.mjs for any logged metadata.
- System/user prompts tuned for HUD glyph consistency and defaults stored beside the preset — per plan “Separation of concerns”; wiring may land with Phase D preset work if not in this ticket.

## Acceptance Criteria

- Dry-run or logged path shows rewrite skipped when disabled.
- When enabled, generationResults._sheet includes optional metadata per plan Phase B (e.g. rewriteModel and a rewritten-prompt fingerprint). The plan’s example name `rewrittenPromptSha256` is illustrative: the stored value must match whatever `hashPromptForLog` / manifest policy uses (today a short sha256 hex prefix in logs — not necessarily a full 64-char digest unless explicitly chosen and documented).
- Verifier: test or log fixture demonstrates both branches; manifest/result JSON shape documented in ticket close note or test snapshot.

