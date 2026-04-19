---
id: 2gp-47nd
status: closed
deps: [2gp-gwjc]
links: []
created: 2026-04-19T03:02:23Z
type: task
priority: 1
assignee: user.email
parent: 2gp-czux
---
# openai-vision-qa → TypeScript

Convert **tools/openai-vision-qa.mjs** to **.ts**; update **package.json** scripts to use the **`2gp-gwjc`** runner. Preserve CLI behavior (including **OPENAI_API_KEY** unset → documented skip with **exit 0**—not a CI failure). Update **tools/README.md**, **.env.example**, and CLI help strings that cite **.mjs** paths.

## Acceptance Criteria

After **`2gp-gwjc`**: **npm run typecheck** (and tools variant if split) covers this file; **npm test** green.

**Verification:** with **OPENAI_API_KEY** unset, **`npm run qa:vision`** (or the chosen script) exits **0** with the expected skip message—verifiers must not require a live OpenAI call or network in CI; do not log secrets.

**rg** `openai-vision-qa\.mjs`: no stale first-party references in **tools/**, **src/**, tests, or docs (allowlisted exceptions noted in verifier notes).

