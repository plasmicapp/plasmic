import { describe, expect, it } from "vitest";
import { mergeProperties } from "./Properties";

describe("mergeProperties", () => {
  it("returns undefined when there are no properties", () => {
    expect(mergeProperties()).toBeUndefined();
    expect(mergeProperties(undefined, {}, undefined)).toBeUndefined();
  });

  it("shallowly replaces values without mutating the inputs", () => {
    const base = {
      region: "us",
      context: { project: "base", user: "user" },
      items: [1, 2],
    };
    const override = { context: { project: "event" }, items: [3] };
    expect(mergeProperties(base, undefined, override)).toEqual({
      region: "us",
      context: { project: "event" },
      items: [3],
    });
    expect(base).toEqual({
      region: "us",
      context: { project: "base", user: "user" },
      items: [1, 2],
    });
    expect(override).toEqual({ context: { project: "event" }, items: [3] });
  });

  it("preserves Error identity and explicit undefined overrides", () => {
    const error = new Error("boom");
    const merged = mergeProperties(
      { region: "us", error: { message: "old" } },
      { region: undefined, error },
    );
    expect(merged).toEqual({ region: undefined, error });
    expect(merged?.error).toBe(error);
  });
});
