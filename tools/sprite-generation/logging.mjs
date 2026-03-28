/**
 * Structured logging for the sprite-generation pipeline (`pipeline.mjs`, generators, QA bridges).
 *
 * ## Line shape
 *
 * Each line is written with `console.log` (stdout), same structure as the inline helper in
 * `tools/dpad-workflow.mjs` (see ~288–301):
 *
 * ```
 * [ISO-8601] [<tag>] [LEVEL] [step] message
 * ```
 *
 * When `extra` is a non-empty object, the same line is followed by ` | ` and
 * `JSON.stringify(extra)` on the same `console.log` call (so one logical record).
 *
 * ## Intentional delta vs legacy `dpad-workflow`
 *
 * The second bracketed field is **`[sprite-gen]`** here. Legacy lines use **`[dpad-workflow]`**
 * so logs from the shared library remain distinguishable in mixed runs until the monolith
 * migrates to this module (**2gp-b4lm**).
 *
 * ## Levels
 *
 * `DEBUG`, `INFO`, `WARN`, and `ERROR` are labels only — this module does not filter by level;
 * callers that need quiet modes should avoid calling `log` for DEBUG or pass a no-op.
 *
 * ## Constraints
 *
 * No network, fal client, or filesystem access — only `console.log` with serializable `extra`.
 *
 * @param {'DEBUG'|'INFO'|'WARN'|'ERROR'} level
 * @param {string} step Short phase id, e.g. `init`, `fal:up`, `qa`
 * @param {string} message
 * @param {Record<string, unknown>} [extra] Optional structured fields (JSON-serializable)
 */
export function log(level, step, message, extra) {
  const ts = new Date().toISOString();
  const base = `[${ts}] [sprite-gen] [${level}] [${step}] ${message}`;
  if (extra && Object.keys(extra).length > 0) {
    console.log(base, "|", JSON.stringify(extra));
  } else {
    console.log(base);
  }
}
