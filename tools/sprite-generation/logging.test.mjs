import { afterEach, describe, expect, it, vi } from "vitest";

import { log } from "./logging.mjs";

describe("sprite-generation logging", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits base line with sprite-gen tag and optional JSON extra", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    log("INFO", "step-a", "hello");
    expect(spy).toHaveBeenCalledOnce();
    const line0 = String(spy.mock.calls[0][0]);
    expect(line0).toMatch(/^\[\d{4}-\d{2}-\d{2}T[^\]]+\] \[sprite-gen\] \[INFO\] \[step-a\] hello$/);

    log("WARN", "step-b", "warn", { k: 1 });
    expect(spy).toHaveBeenCalledTimes(2);
    expect(String(spy.mock.calls[1][0])).toMatch(
      /^\[\d{4}-\d{2}-\d{2}T[^\]]+\] \[sprite-gen\] \[WARN\] \[step-b\] warn$/,
    );
    expect(spy.mock.calls[1][1]).toBe("|");
    expect(spy.mock.calls[1][2]).toBe('{"k":1}');
  });

  it("omits extra segment when extra is empty object", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log("DEBUG", "x", "m", {});
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0].length).toBe(1);
  });
});
