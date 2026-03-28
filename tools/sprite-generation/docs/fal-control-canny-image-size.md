# `fal-ai/flux-control-lora-canny`: `image_size` vs decoded output

This note supports D-pad sprite work (see epic **2gp-p4js**): the pipeline requests **`400×100`** for sheet jobs while observing **512×512** PNGs in some runs, then **nearest-neighbor** resizes to the sheet size. Ticket **2gp-svav** adds **logging only** (no resize/crop behavior changes).

## Instrumentation (`tools/sprite-generation/generators/fal.mjs`)

| Hook | What is logged |
|------|----------------|
| Before `subscribe()` | **`subscribe() request input (redacted)`** or **`subscribe() control-canny request input (redacted)`** — full serialized `input` after **`redactFalInputForLog`**: `control_lora_image_url` data URIs become a short prefix + payload length; `prompt` becomes `{ length, sha256Hex16 }`; suspicious key names become `"<redacted>"`. |
| After download | **`subscribe() done`** includes **`requestedImageSize`** (string preset or `{ width, height }` from `parseImageSize`), **`falResponseImagePx`** when the queue result includes `images[0].width` / `.height` (OpenAPI **`Image`**), and **`pngDecodedPx`** from **`readPngBufferDimensions`** — **`PNG.sync.read`** first, else IHDR parse. |

Pipeline consumers (`pipeline.mjs`) are unchanged; the first place dimensions appear after the network round-trip is inside these **`falSubscribe*ToBuffer`** helpers.

## `falExtras` / `falExtraInput` (answer **c**)

`runPipeline` passes **`preset.fal.falExtrasControl`** (D-pad: **`DPAD_FAL_CONTROL_EXTRA_INPUT`** in `presets/dpad.mjs`) as **`falExtraInput`** into **`falSubscribeControlCannyToBuffer`**. It is merged **into** the base `input` object **after** defaults (`num_images`, `output_format`, `preprocess_depth: false`, …). Later keys win for duplicates — e.g. preset sets **`output_format: "png"`** again over the helper’s **`"png"`**. Shape is a flat **`Record<string, unknown>`** matching **`FluxControlLoraCannyInput`** (see OpenAPI below): **`num_inference_steps`**, **`guidance_scale`**, **`control_lora_strength`**, **`preprocess_depth`**, etc.

## Authoritative API surface (OpenAPI)

Queue schema: `https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=fal-ai/flux-control-lora-canny`

- **`image_size`**: `ImageSize` object **`{ width, height }`** **or** enum string **`square_hd` \| `square` \| `portrait_4_3` \| `portrait_16_9` \| `landscape_4_3` \| `landscape_16_9`**. Default **`landscape_4_3`**.
- **`ImageSize`** defaults in schema: **`width`** default **512**, **`height`** default **512** (used when building objects without explicit fields — not what we pass for `400x100`).
- Response **`images[]`**: each **`Image`** includes **`url`**, **`width`**, **`height`** (compare to **`pngDecodedPx`** after download).

Human-readable enum list: [fal-ai/flux-control-lora-canny API](https://fal.ai/models/fal-ai/flux-control-lora-canny/api) (same enum values).

## Comparison table: `400×100` vs string presets

**Empirical decoded / API columns:** fill by running the probe (below) or any **`mode: generate`** pipeline with **`FAL_KEY`** and reading **`subscribe() done`** lines. This workspace run **did not** execute live fal calls (no **`FAL_KEY`** in the automation environment).

| Request `image_size` | `parseImageSize` / notes | Expected per docs (typical FLUX presets) | Decoded PNG `pngDecodedPx` (empirical) | `falResponseImagePx` (empirical) |
|---------------------|---------------------------|------------------------------------------|----------------------------------------|----------------------------------|
| **`400x100`** | `{ width: 400, height: 100 }` | Custom rectangle — API allows non-square **`ImageSize`** | *Run probe / pipeline* | *Run probe / pipeline* |
| **`landscape_16_9`** | passed through as string | Preset (wide 16:9) | *Run probe / pipeline* | *Run probe / pipeline* |
| **`landscape_4_3`** | passed through as string | Default preset on this model | *Run probe / pipeline* | *Run probe / pipeline* |
| **`square_hd`** | passed through as string | High-res square preset | *Run probe / pipeline* | *Run probe / pipeline* |

### Live probe (optional, costs API usage)

```bash
FAL_KEY=… node tools/sprite-generation/probe-fal-control-canny-sizes.mjs
```

Copy **`requestedImageSize`**, **`falResponseImagePx`**, and **`pngDecodedPx`** from the **`subscribe() done`** logs into the table.

## Answers

**(a) Does this endpoint honor non-square `image_size` for this model?**  
The **API accepts** non-square sizes: **`image_size`** may be a **`{ width, height }`** object with independent width/height (OpenAPI **`ImageSize`**, max 14142). Whether a **given** request returns an image with **matching** pixel dimensions is **empirical**: use **`falResponseImagePx`** and **`pngDecodedPx`** in logs. If the service returns a square (e.g. **512×512**) while **`400×100`** was requested, that shows up as a mismatch there — not by inferring from the schema alone.

**(b) Under what conditions does decoded output become 512² vs requested dimensions?**  
- **Schema defaults** for the **`ImageSize` *type*** use **512×512** as **default** width/height when an object is built without fields; that does **not** override an explicit **`{ width: 400, height: 100 }`**.  
- **Preset strings** map to fixed resolutions defined by fal for this model family (see fal docs / model arguments). **`square`** and related presets yield square outputs; exact pixel sizes should match **`falResponseImagePx`** / **`pngDecodedPx`**.  
- **Observed in product context (epic 2gp-p4js):** sheet path sometimes received **512×512** PNGs for a **400×100** request, triggering **nearest-neighbor** resize in **`pipeline.mjs`** — confirm per run with the new logs.

**(c) Merged extras (`falExtras`) shape if they affect `input`.**  
See section **`falExtras` / `falExtraInput`** above: merged flat object on top of base **`input`**; duplicates resolve in favor of **`falExtraInput`** keys.

## Log excerpt shape (illustrative)

Redacted request line (structure only):

```json
{
  "prompt": { "length": 1200, "sha256Hex16": "abcdef0123456789" },
  "image_size": { "width": 400, "height": 100 },
  "num_images": 1,
  "output_format": "png",
  "control_lora_image_url": "<data-uri data:image/png;base64 payloadChars=…>",
  "preprocess_depth": false,
  "num_inference_steps": 32,
  "guidance_scale": 4,
  "control_lora_strength": 0.58
}
```

Completion line fields: **`requestedImageSize`**, **`falResponseImagePx`**, **`pngDecodedPx`**, **`bytes`**, **`wallMs`**.
