import { isLinkCompatible } from "@/wab/shared/linked-props";
import { typeFactory } from "@/wab/shared/model/model-util";

describe("isLinkCompatible", () => {
  it("matches identical primitive types", () => {
    expect(isLinkCompatible(typeFactory.text(), typeFactory.text())).toBe(true);
    expect(isLinkCompatible(typeFactory.num(), typeFactory.num())).toBe(true);
    expect(isLinkCompatible(typeFactory.bool(), typeFactory.bool())).toBe(true);
    expect(isLinkCompatible(typeFactory.bool(), typeFactory.text())).toBe(
      false
    );
  });

  it("rejects mismatched scalar types", () => {
    expect(isLinkCompatible(typeFactory.text(), typeFactory.num())).toBe(false);
    expect(isLinkCompatible(typeFactory.num(), typeFactory.text())).toBe(false);
    expect(isLinkCompatible(typeFactory.text(), typeFactory.bool())).toBe(
      false
    );
    expect(
      isLinkCompatible(typeFactory.bool(), typeFactory.choice(["a"]))
    ).toBe(false);
    expect(isLinkCompatible(typeFactory.num(), typeFactory.choice(["a"]))).toBe(
      false
    );
    expect(isLinkCompatible(typeFactory.choice(["a"]), typeFactory.num())).toBe(
      false
    );
  });

  it("lets a text prop read from a single choice, but not the reverse", () => {
    const choice = typeFactory.choice(["a", "b"]);
    // outer choice -> inner text: the choice only supplies its own values,
    // which text accepts.
    expect(isLinkCompatible(typeFactory.text(), choice)).toBe(true);
    // inner choice <- outer text: text supplies values the choice's options
    // don't cover.
    expect(isLinkCompatible(choice, typeFactory.text())).toBe(false);
  });

  it("only widens text ← choice for string-valued choices", () => {
    // A numeric/boolean choice value would reach the text prop as a non-string.
    expect(
      isLinkCompatible(typeFactory.text(), typeFactory.choice([1, 2]))
    ).toBe(false);
    expect(
      isLinkCompatible(typeFactory.text(), typeFactory.choice([true, false]))
    ).toBe(false);
  });

  it("does not let a scalar read from a multiChoice (array vs scalar)", () => {
    const multi = typeFactory.multiChoice(["a", "b"]);
    expect(isLinkCompatible(typeFactory.text(), multi)).toBe(false);
    expect(isLinkCompatible(multi, typeFactory.text())).toBe(false);
  });

  it("matches choice props with the same options (order-independent)", () => {
    expect(
      isLinkCompatible(
        typeFactory.choice(["a", "b"]),
        typeFactory.choice(["b", "a"])
      )
    ).toBe(true);
  });

  it("rejects choice props with different options", () => {
    expect(
      isLinkCompatible(
        typeFactory.choice(["a", "b"]),
        typeFactory.choice(["a", "c"])
      )
    ).toBe(false);
    expect(
      isLinkCompatible(
        typeFactory.choice(["a", "b"]),
        typeFactory.choice(["a"])
      )
    ).toBe(false);
  });

  it("treats numeric and string choice options as distinct", () => {
    expect(
      isLinkCompatible(
        typeFactory.choice([1, 2]),
        typeFactory.choice(["1", "2"])
      )
    ).toBe(false);
    expect(
      isLinkCompatible(typeFactory.choice([1, 2]), typeFactory.choice([1, 2]))
    ).toBe(true);
  });

  it("rejects single vs multi choice", () => {
    expect(
      isLinkCompatible(
        typeFactory.choice(["a", "b"]),
        typeFactory.multiChoice(["a", "b"])
      )
    ).toBe(false);
  });

  it("matches multiChoice props with the same options", () => {
    expect(
      isLinkCompatible(
        typeFactory.multiChoice(["a", "b"]),
        typeFactory.multiChoice(["a", "b"])
      )
    ).toBe(true);
  });

  it("matches functions with the same positional arg types", () => {
    const a = typeFactory.func(
      typeFactory.arg("x", typeFactory.text()),
      typeFactory.arg("y", typeFactory.num())
    );
    // Arg names differ but positional types match.
    const b = typeFactory.func(
      typeFactory.arg("p", typeFactory.text()),
      typeFactory.arg("q", typeFactory.num())
    );
    expect(isLinkCompatible(a, b)).toBe(true);
  });

  it("rejects functions with different arity or arg types", () => {
    const two = typeFactory.func(
      typeFactory.arg("x", typeFactory.text()),
      typeFactory.arg("y", typeFactory.num())
    );
    const one = typeFactory.func(typeFactory.arg("x", typeFactory.text()));
    const swapped = typeFactory.func(
      typeFactory.arg("x", typeFactory.num()),
      typeFactory.arg("y", typeFactory.text())
    );
    expect(isLinkCompatible(two, one)).toBe(false);
    expect(isLinkCompatible(two, swapped)).toBe(false);
  });

  it("rejects a function against a non-function", () => {
    const fn = typeFactory.func(typeFactory.arg("x", typeFactory.text()));
    expect(isLinkCompatible(fn, typeFactory.text())).toBe(false);
    expect(isLinkCompatible(typeFactory.text(), fn)).toBe(false);
  });
});
