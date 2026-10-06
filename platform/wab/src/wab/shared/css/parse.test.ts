import { joinCssValues, splitCssValue } from "@/wab/shared/css/parse";

describe("splitCssValue", () => {
  it("splits at commas outside brackets and quotes", () => {
    expect(
      splitCssValue(
        undefined,
        `hello, yes, "no, maybe", 'I dunno, can you', what`,
      ),
    ).toEqual(["hello", "yes", '"no, maybe"', "'I dunno, can you'", "what"]);

    const gradient =
      "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(39, 46, 48, 1) 0%, rgba(14, 14, 14, 1) 100%)";
    expect(splitCssValue(undefined, `${gradient}, ${gradient}`)).toEqual([
      gradient,
      gradient,
    ]);
    expect(
      splitCssValue(
        undefined,
        'url("what is, linear(gradient, okay), whatevs"), yup',
      ),
    ).toEqual(['url("what is, linear(gradient, okay), whatevs")', "yup"]);
    expect(
      splitCssValue(
        undefined,
        "yes, (where do we (go, and), nobody (knows, and) so), on",
      ),
    ).toEqual(["yes", "(where do we (go, and), nobody (knows, and) so)", "on"]);
    expect(splitCssValue("font-family", "  Open  Sans  , serif  ")).toEqual([
      "Open  Sans",
      "serif",
    ]);
  });

  it("splits filter effects at whitespace", () => {
    const effects = [
      "hidden#blur(2px)",
      "drop-shadow(1px 2px rgba(0, 0, 0, .5))",
      "hidden#contrast(150%)",
    ];
    expect(splitCssValue("filter", `  ${effects.join(" \t\n ")} `)).toEqual(
      effects,
    );
    expect(
      splitCssValue(
        "backdrop-filter",
        joinCssValues("backdrop-filter", effects),
      ),
    ).toEqual(effects);
    expect(splitCssValue(undefined, "blur(2px) contrast(150%)")).toEqual([
      "blur(2px) contrast(150%)",
    ]);
  });

  it("keeps each item's text as written", () => {
    const layers = [
      'url("a b.png") text /* keep, this */',
      "var(--image-abc) top 50% left 50% / cover no-repeat /* clip: text **/",
      'url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>\')',
    ];
    const value = layers.join(", ");
    expect(splitCssValue("background", value)).toEqual(layers);
    expect(
      joinCssValues("background", splitCssValue("background", value)),
    ).toEqual(value);
  });

  it("keeps free-text font names whole", () => {
    expect(
      splitCssValue(
        "font-family",
        "Mr. Eaves, AT&T Aleck Sans, Trade Gothic Bold No. 2",
      ),
    ).toEqual(["Mr. Eaves", "AT&T Aleck Sans", "Trade Gothic Bold No. 2"]);
    expect(
      splitCssValue("font-family", 'Family\\,One, "A\\",B", Family\\  , serif'),
    ).toEqual(["Family\\,One", '"A\\",B"', "Family\\ ", "serif"]);
    expect(splitCssValue("font-family", "a), b")).toEqual(["a)", "b"]);
  });

  it("returns no empty items", () => {
    expect(splitCssValue(undefined, "")).toEqual([]);
    expect(splitCssValue(undefined, " \t\n ")).toEqual([]);
    expect(splitCssValue("filter", " \t\n ")).toEqual([]);
    expect(splitCssValue(undefined, ",a,,b,")).toEqual(["a", "b"]);
  });
});
