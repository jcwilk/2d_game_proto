import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, test } from "vitest";

test("openai-vision-qa exits 0 with skip message when OPENAI_API_KEY is unset", () => {
  const env = { ...process.env };
  delete env["OPENAI_API_KEY"];
  const script = resolve(import.meta.dirname, "openai-vision-qa.ts");
  const r = spawnSync(process.execPath, ["--experimental-strip-types", script], {
    encoding: "utf8",
    env,
  });
  expect(r.status).toBe(0);
  expect(r.stdout).toContain("skipped");
  expect(r.stdout).toContain("OPENAI_API_KEY");
});
