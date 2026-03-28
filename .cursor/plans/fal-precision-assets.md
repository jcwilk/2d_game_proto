# fal.ai: precision rasters & style consistency (research synthesis)

**Scope:** How to use **fal** (and comparable T2I hosts) for **game/UI assets** that must be **composable** (correct silhouette, repeatable style)—not hero art. **Concrete reference implementation:** `tools/dpad-workflow.mjs`. **Lower-level CLI:** `tools/fal-raster-generate.mjs`. **Stack roles:** `tools/README.md`, `project-implementation-deep-dive.md` §E.

---

## 1. Failure modes of naive text-to-image

| Issue | Mechanism | What helps |
|--------|-----------|------------|
| **Wrong layout** (e.g. whole D-pad vs one segment) | Strong **object priors**; prose is a weak constraint on geometry | **Spatial** control: masks, inpaint regions, **ControlNet** (canny/sketch/edge) from a **guide image**—not stronger adjectives alone |
| **Style drift across siblings** | Independent samples; different noise paths | **Frozen recipe**, **one style reference** (IP-Adapter–class), **one atlas + slice**, or **non-gen** base art |
| **No usable alpha** | Latent decode → RGB; APIs often ship **opaque** PNG | Plan **post**: chroma key, matting, removal step, or **author** alpha outside T2I |
| **403 / “Forbidden”** | Often **`detail`** in JSON (e.g. **exhausted balance**), not just `statusText` | Parse **`body.detail`**; clients that only show `message` hide the fix—see `fal-raster-generate.mjs` error formatting |

**Role clarity:** **IP-Adapter / style refs** → **look** (palette, stroke). **ControlNet / masks** → **where** pixels go. **img2img** → preserves **structure** of init; use for derivatives, not as a substitute for layout control when the model keeps drawing the wrong object.

---

## 2. fal billing (verify live before budgeting)

fal’s **pricing page** states image models are billed by **output image count** and/or **output megapixels** (tables often **normalized to 1 MP**; higher resolution scales proportionally). Some endpoints use **GPU/compute** pricing instead—**per-model**.

**Illustrative rows** (rates change—confirm on [fal.ai/pricing](https://fal.ai/pricing) + each model page):

| Pattern | Example endpoints (ids) | Implication for **many small** PNGs |
|--------|-------------------------|--------------------------------------|
| **Per MP** | `fal-ai/flux/dev`, `fal-ai/flux/schnell`, `fal-ai/qwen-image` | Cost ~ **linear in total pixels** across outputs; small tiles × many files can still be cheap **vs** few huge images at same total MP |
| **Per image** | e.g. Flux Kontext Pro, Seedream-class, some “nano” models | Each file is often a **full billing unit**—high **count** hurts; check **minimum resolution** (tiny sprites may be invalid or clamped) |
| **Per compute time** | Some SDXL-class endpoints | Cost tracks **wall/GPU**—not linear in resolution by default |

**Rule of thumb:** Prefer **per-MP** endpoints when you emit **lots** of small rasters; **audit** the exact row before automating. Replicate and other hosts mix **per-output** and **time** pricing similarly—read the **model** row, not the landing page tagline.

---

## 3. Style lock: what actually works

- **Same** `model id`, **resolution**, **steps**, **guidance**, **prompt template**; only **allowed** tokens change (direction, frame id).
- **Fixed seed** → reproducibility of **one** prompt + stack; **not** a guarantee of **matching look** across **different** prompts or **after** model weight updates. Record **full recipe** (model version, params, post chain), not seed alone.
- **Same seed across siblings** is an **experiment knob**, not a substitute for **reference conditioning** when composition differs per call.
- **FLUX vs SDXL:** third-party comparisons often favor **FLUX** for **instruction following** and sometimes **legible text**—treat as **hypothesis**; benchmark on **your** prompts and sizes. There is no vendor-standard “best for UI icons.”

---

## 4. Layout strategies

| Approach | Style coherence | Failure modes |
|----------|-----------------|---------------|
| **One sheet + programmatic slice** | Often **lower** palette drift than N separate jobs | Misaligned grid; bad crop; one failure spoils batch |
| **N files + shared recipe + refs** | Flexible | Drift without **style anchor** or **conditioning** |
| **Vector / pixel tool for shape** + optional gen for texture | **Highest** predictability for HUD | Upfront authoring time |

**Market reality:** Public search did **not** surface a fal-specific **“icon-only”** endpoint—expect **generic** image APIs plus **your** conditioning and post.

---

## 5. Measurement (deterministic + optional semantic)

**`tools/png-analyze.mjs`:** dimensions, file size, **alpha histogram** (transparent vs opaque %), **opaque bounding box**, optional **grid projection** (`--sprite-width` / `--sprite-height`) → remainder, divisibility, edge energy on cell boundaries. Use for **regression** and **atlas divisibility**, not “is the art good.”

**`tools/openai-vision-qa.mjs`:** structured JSON (e.g. grid misalignment score, drift notes, suggested prompt delta, artifacts). **Subjective QA** and iteration hints—**not** ground-truth pixel alignment.

---

## 6. End-to-end pipeline (critique-hardened checklist)

Order matters; **ControlNet** is **optional**—default it only when layout must be locked.

1. **Specs + style contract** — sizes/DPR, naming, **sRGB / alpha convention** (straight vs premultiplied), folder layout.
2. **Rights & provenance** — API ToS, model license, log **recipe id** + model version per batch.
3. **Generation recipe** — prompts, negatives, optional **spatial** + **style** conditioning; **hash or version** the full stack.
4. **Batch / throughput** — concurrency limits, retries, **cost logging** (MP vs image count vs time).
5. **Raster post** — opaque→alpha, trim, pad, power-of-two if required.
6. **Layout / atlas** — sheet vs cells; padding/bleed rules.
7. **Engine smoke** — import once in target renderer (compression, mips, nine-slice)—**before** declaring art final.
8. **QA loops** — (a) file metrics (`png-analyze`); (b) in-build/UI context; optional vision QA.
9. **Accessibility / platform** — contrast on real backgrounds; texture caps.
10. **Release** — frozen asset set tied to build; document model updates.

**Gaps to avoid:** treating **aesthetic** review as **license** clearance; collapsing **file QA** and **in-engine QA** into one gate; **mandating** ControlNet for every **flat** icon when prompts + refs suffice.

---

## 7. Reference implementation (`dpad-workflow.mjs`)

| Piece | Role |
|-------|------|
| **`--mode mock`** | Proves **folder + manifest + QA** without T2I (pngjs triangles, real alpha) |
| **`--mode generate`** | `fal.subscribe` **per tile**; `@fal-ai/client`; **`FAL_KEY`** env only; **queue** status logged on change |
| **`--dry-run`** | Plans **generate** paths and **prompt previews** **without** `FAL_KEY` |
| **Manifest** | `public/art/dpad/manifest.json` — recipe, per-direction `generationResults` (seed, ms, errors) |
| **Prompts** | Centralized builder + shared **negatives** (e.g. full controller, extra buttons)—tune in one place |
| **QA** | `png-analyze` per output with fixed sprite grid |

Generalize by swapping **direction list** for **frame ids**, swapping **endpoint** / conditioning when the catalog supports it, **keeping** manifest + metrics + verbose logs.

---

## 8. When to skip generative entirely

**Exact** geometry (radii, symmetry, **readable text**), **tight** nine-slice margins, or **pixel-perfect** multi-state UI: **SVG / Figma / Aseprite** (or hybrid: vector layout + light img2img). Diffusion is weakest where **CAD-like** precision is required.

---

## 9. Minimum viable discipline

1. **Constrain layout spatially** when text fails (mask / inpaint / ControlNet guide).
2. **Freeze recipe + use style anchors** for sets; don’t rely on seed alone.
3. **Measure** (png-analyze + optional vision QA + in-engine) before shipping.

---

*Last aligned with repo tooling and web research passes (2026-03); **re-verify** fal rates and model ids on deploy.*
