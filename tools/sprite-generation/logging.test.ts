import { afterEach, describe, expect, it, vi } from "vitest";

import { log } from "./logging.ts";

describe("sprite-generation logging", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits base line with sprite-gen tag and optional JSON extra", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    log("INFO", "step-a", "hello");
    expect(spy).toHaveBeenCalledOnce();
    const firstCall = spy.mock.calls[0];
    if (firstCall === undefined) throw new Error("expected one log call");
    const line0 = String(firstCall[0]);
    expect(line0).toMatch(/^\[\d{4}-\d{2}-\d{2}T[^\]]+\] \[sprite-gen\] \[INFO\] \[step-a\] hello$/);

    log("WARN", "step-b", "warn", { k: 1 });
    expect(spy).toHaveBeenCalledTimes(2);
    const secondCall = spy.mock.calls[1];
    if (secondCall === undefined) throw new Error("expected two log calls");
    expect(String(secondCall[0])).toMatch(
      /^\[\d{4}-\d{2}-\d{2}T[^\]]+\] \[sprite-gen\] \[WARN\] \[step-b\] warn$/,
    );
    expect(secondCall[1]).toBe("|");
    expect(secondCall[2]).toBe('{"k":1}');
  });

  it("omits extra segment when extra is empty object", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log("DEBUG", "x", "m", {});
    expect(spy).toHaveBeenCalledOnce();
    const onlyCall = spy.mock.calls[0];
    if (onlyCall === undefined) throw new Error("expected one log call");
    expect(onlyCall.length).toBe(1);
  });
});
