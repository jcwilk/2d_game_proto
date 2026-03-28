#!/usr/bin/env node
/**
 * Optional OpenAI vision QA: Chat Completions + structured JSON (§E.5.1).
 * Server-side only — never import from Vite / `src/`.
 */
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

/** Default matches plan §E.5.1 (vision + structured outputs on Chat Completions). */
const DEFAULT_VISION_MODEL = "gpt-4o";

const VISION_QA_SCHEMA = {
  name: "vision_qa",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      grid_misalignment_severity: {
        type: "integer",
        description: "0–10 how misaligned the sheet appears vs an ideal grid",
        minimum: 0,
        maximum: 10,
      },
      semantic_drift_notes: {
        type: "string",
        description: "Brief notes on semantic/style drift vs a typical game sprite brief",
      },
      suggested_prompt_delta: {
        type: "string",
        description: "Concrete fal/OpenAI prompt tweak suggestion for the next iteration",
      },
      obvious_artifacts: {
        type: "array",
        items: { type: "string" },
        description: "Visible artifacts (extra limbs, holes, color banding, etc.)",
      },
    },
    required: [
      "grid_misalignment_severity",
      "semantic_drift_notes",
      "suggested_prompt_delta",
      "obvious_artifacts",
    ],
  },
};

function printHelp() {
  console.log(`Usage: node tools/openai-vision-qa.mjs <image.png> [options]

Calls OpenAI Chat Completions with vision + JSON schema (structured outputs). Use after
deterministic png-analyze metrics; see tools/README.md and plan §E.5.1.

Options:
  --prompt <text>     Extra instructions for the reviewer (default: sprite/atlas QA brief)
  --detail <low|high> Image token detail (default: low)

Environment:
  OPENAI_API_KEY       Required to run; if unset, exits 0 with a skip message
  OPENAI_VISION_MODEL  Model id (default: ${DEFAULT_VISION_MODEL})
`);
}

/**
 * @param {string} path
 */
function mimeForPath(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {{ imagePath: string; prompt: string; detail: 'low' | 'high' }} */
  const out = {
    imagePath: "",
    prompt: "",
    detail: "low",
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      case "--prompt": {
        const v = argv[++i];
        if (v === undefined) throw new Error("Missing value after --prompt");
        out.prompt = v;
        break;
      }
      case "--detail": {
        const v = argv[++i];
        if (v !== "low" && v !== "high") throw new Error("--detail must be low or high");
        out.detail = v;
        break;
      }
      default:
        if (a.startsWith("-")) throw new Error(`Unknown option: ${a}`);
        if (out.imagePath) throw new Error("Only one image path supported");
        out.imagePath = a;
    }
  }
  if (!out.imagePath) throw new Error("Missing image path");
  return out;
}

const DEFAULT_USER_PROMPT =
  "You are reviewing a game sprite or atlas raster for production. " +
  "Assess grid alignment cues, semantic fit for pixel/2D art, and obvious defects. " +
  "Be concise; scores are subjective QA only, not ground truth.";

async function main() {
  const key = process.env.OPENAI_API_KEY;
  if (!key || String(key).trim() === "") {
    console.log(
      "openai-vision-qa: skipped — OPENAI_API_KEY is unset (set it to run vision QA; see tools/README.md).",
    );
    process.exit(0);
  }

  let opts;
  try {
    opts = parseArgs(process.argv);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`error: ${msg}`);
    process.exit(1);
  }

  const imagePath = resolve(opts.imagePath);
  let buf;
  try {
    buf = readFileSync(imagePath);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`error: cannot read image: ${msg}`);
    process.exit(2);
  }

  const b64 = buf.toString("base64");
  const mime = mimeForPath(imagePath);
  const dataUrl = `data:${mime};base64,${b64}`;

  const model = process.env.OPENAI_VISION_MODEL?.trim() || DEFAULT_VISION_MODEL;
  const textPrompt = opts.prompt.trim() ? `${DEFAULT_USER_PROMPT}\n\n${opts.prompt}` : DEFAULT_USER_PROMPT;

  const t0 = Date.now();
  const res = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: textPrompt },
            {
              type: "image_url",
              image_url: { url: dataUrl, detail: opts.detail },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: VISION_QA_SCHEMA,
      },
    }),
  });

  const elapsedMs = Date.now() - t0;

  if (!res.ok) {
    const errText = await res.text();
    console.error(`error: OpenAI HTTP ${res.status}: ${errText}`);
    process.exit(2);
  }

  /** @type {{ choices?: Array<{ message?: { content?: string } }>; usage?: object }} */
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content;
  if (typeof raw !== "string" || !raw.trim()) {
    console.error("error: empty completion content from OpenAI");
    process.exit(2);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("error: completion was not valid JSON");
    process.exit(2);
  }

  const out = {
    image: basename(imagePath),
    model,
    wall_clock_ms: elapsedMs,
    usage: data.usage ?? null,
    api: "chat_completions",
    structured: parsed,
  };
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
});
