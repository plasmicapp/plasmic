import { tuple } from "@/wab/shared/common";
import {
  BackgroundLayer,
  bgClipTextTag,
  ColorFill,
  Dim,
  ImageBackground,
  LinearGradient,
  NoneBackground,
  Stop,
} from "@/wab/shared/core/bg-styles";
import { parseCss } from "@/wab/shared/css";

describe("cssPegParser", function () {
  const parseback = (x, { rule }) => parse(x, { rule }).showCss();
  const parse = (x, { rule }) => parseCss(x, { startRule: rule });
  const bgParse = (x) => parse(x, { rule: "backgroundImage" });
  it("should parse image backgrounds", () =>
    expect(bgParse('url("http://aoeu")')).toEqual(
      new ImageBackground({ url: "http://aoeu" })
    ));
  it("should parse variable refs", () => {
    expect(bgParse("var(--image-hello)")).toEqual(
      new ImageBackground({ url: "var(--image-hello)" })
    );

    expect(bgParse("var(--token-abc)")).toEqual(
      new ColorFill({ color: "var(--token-abc)" })
    );
  });
  it("should parse linear gradients", function () {
    expect(bgParse("linear-gradient(90deg, black 50%, #fff 70%)")).toEqual(
      new LinearGradient({
        repeating: false,
        angle: 90,
        stops: tuple(
          new Stop("black", new Dim(50, "%")),
          new Stop("#fff", new Dim(70, "%"))
        ),
      })
    );
    expect(bgParse("linear-gradient(30deg, #fff 50%)")).toEqual(
      new LinearGradient({
        repeating: false,
        angle: 30,
        stops: [new Stop("#fff", new Dim(50, "%"))],
      })
    );
    expect(
      bgParse("repeating-linear-gradient(90deg, black 50%, #fff 70%)")
    ).toEqual(
      new LinearGradient({
        repeating: true,
        angle: 90,
        stops: tuple(
          new Stop("black", new Dim(50, "%")),
          new Stop("#fff", new Dim(70, "%"))
        ),
      })
    );
    expect(bgParse("linear-gradient(10deg, rgb(0,0,0) 50%)")).toEqual(
      new LinearGradient({
        repeating: false,
        angle: 10,
        stops: [new Stop("rgb(0,0,0)", new Dim(50, "%"))],
      })
    );
    return expect(
      bgParse("repeating-linear-gradient(90deg, rgba(255, 255, 255, .1) 50%)")
    ).toEqual(
      new LinearGradient({
        repeating: true,
        angle: 90,
        stops: [new Stop("rgba(255,255,255,.1)", new Dim(50, "%"))],
      })
    );
  });
  it("should render back to original CSS string", () => {
    [
      "linear-gradient(90deg, black 50%, #fff 70%)",
      "linear-gradient(10deg, #fff 50%)",
      "repeating-linear-gradient(90deg, black 50%, #fff 70%)",
      "repeating-linear-gradient(0deg, #fff 50%)",
      "radial-gradient(ellipse 60% 40% at 20% 20%, #e66465 0%, #9198e5 100%)",
      "repeating-radial-gradient(ellipse 60% 40% at 20% 20%, #e66465 0%, #9198e5 100%)",
    ].map((x) => expect(parseback(x, { rule: "backgroundImage" })).toBe(x));

    // test out same values for linearGradient rule.
    [
      "linear-gradient(90deg, black 50%, #fff 70%)",
      "linear-gradient(10deg, #fff 50%)",
      "repeating-linear-gradient(90deg, black 50%, #fff 70%)",
      "repeating-linear-gradient(0deg, #fff 50%)",
    ].map((x) => expect(parseback(x, { rule: "linearGradient" })).toBe(x));
  });
  const removeNils = (layer: BackgroundLayer) => {
    Object.keys(layer).forEach((key) => {
      if (layer[key] == null) {
        delete layer[key];
      }
    });
    return layer;
  };
  it("should parse background shorthand correctly", () => {
    const layer: BackgroundLayer = parse(
      `url("img_tree.png") right top no-repeat`,
      { rule: "backgroundLayer" }
    );
    expect(removeNils(layer)).toEqual(
      new BackgroundLayer({
        image: new ImageBackground({ url: "img_tree.png" }),
        position: "right top",
        repeat: "no-repeat",
      })
    );
    expect(layer.showCss()).toBe(`url("img_tree.png") right top no-repeat`);
  });
  it("should parse background shorthand correctly", () => {
    const layer: BackgroundLayer = parse(`url("img_tree.png") repeat-y fixed`, {
      rule: "backgroundLayer",
    });
    expect(removeNils(layer)).toEqual(
      new BackgroundLayer({
        image: new ImageBackground({ url: "img_tree.png" }),
        repeat: "repeat-y",
        attachment: "fixed",
      })
    );
    expect(layer.showCss()).toBe(`url("img_tree.png") repeat-y fixed`);
  });
  it("should parse background shorthand correctly", () => {
    const layer: BackgroundLayer = parse(`none`, { rule: "backgroundLayer" });
    expect(removeNils(layer)).toEqual(
      new BackgroundLayer({ image: new NoneBackground() })
    );
    expect(layer.showCss()).toBe(`none`);
  });
  it("should parse background shorthand correctly", () => {
    const layer: BackgroundLayer = parse(
      `linear-gradient(rgb(0,0,0), rgb(0,0,0)) 0% 0% padding-box border-box`,
      { rule: "backgroundLayer" }
    );
    expect(removeNils(layer)).toEqual(
      new BackgroundLayer({
        image: new ColorFill({ color: "rgb(0,0,0)" }),
        position: "0% 0%",
        origin: "padding-box",
        clip: "border-box",
      })
    );
    expect(layer.showCss()).toBe(`linear-gradient(rgb(0,0,0), rgb(0,0,0))`);
    layer.preferBackgroundColorOverColorFill = true;
    expect(layer.showCss()).toBe(`rgb(0,0,0)`);
  });
  it("should parse background shorthand correctly", () => {
    const layer: BackgroundLayer = parse(
      `url("img_tree.png") 10% 15px / 100px 20% repeat padding-box border-box local`,
      { rule: "backgroundLayer" }
    );
    expect(removeNils(layer)).toEqual(
      new BackgroundLayer({
        image: new ImageBackground({ url: "img_tree.png" }),
        position: "10% 15px",
        size: "100px 20%",
        repeat: "repeat",
        origin: "padding-box",
        clip: "border-box",
        attachment: "local",
      })
    );
    expect(layer.showCss()).toBe(
      `url("img_tree.png") 10% 15px / 100px 20% repeat padding-box border-box local`
    );
  });
  it("should parse background shorthand correctly", () => {
    const layer: BackgroundLayer = parse(
      `url("img_tree.png") center center / 100px 20% repeat padding-box text local`,
      { rule: "backgroundLayer" }
    );
    expect(removeNils(layer)).toEqual(
      new BackgroundLayer({
        image: new ImageBackground({ url: "img_tree.png" }),
        position: "center center",
        size: "100px 20%",
        repeat: "repeat",
        origin: "padding-box",
        clip: "text",
        attachment: "local",
      })
    );
    expect(layer.showCss()).toBe(
      `url("img_tree.png") center center / 100px 20% repeat padding-box ${bgClipTextTag} local`
    );
  });
  it("should parse background shorthand correctly", () => {
    const layer: BackgroundLayer = parse(
      `url("img_tree.png") top 10% left 20% / 100px 20% repeat-x border-box ${bgClipTextTag} scroll`,
      { rule: "backgroundLayer" }
    );
    expect(removeNils(layer)).toEqual(
      new BackgroundLayer({
        image: new ImageBackground({ url: "img_tree.png" }),
        position: "top 10% left 20%",
        size: "100px 20%",
        repeat: "repeat-x",
        origin: "border-box",
        clip: bgClipTextTag,
        attachment: "scroll",
      })
    );
    expect(layer.showCss()).toBe(
      `url("img_tree.png") top 10% left 20% / 100px 20% repeat-x border-box ${bgClipTextTag} scroll`
    );
  });
  it("should parse position token correctly", () =>
    expect(
      parse(
        `url("img_tree.png") top 50% left var(--token-OHjHiOT7v) / 100px 20%`,
        {
          rule: "backgroundLayer",
        }
      )
    ).toEqual(
      new BackgroundLayer({
        image: new ImageBackground({ url: "img_tree.png" }),
        position: "top 50% left var(--token-OHjHiOT7v)",
        size: "100px 20%",
      })
    ));

  it("parses and renders box-shadow", () => {
    [
      "3px 4px 5px 6px rgba(0,0,0,0.5), inset -5px -6px -7px -8px rgba(0,0,0,.1)",
    ].map((x) => expect(parseback(x, { rule: "boxShadows" })).toBe(x));
  });

  it("parses comma-separated values", () => {
    expect(parseCss("", { startRule: "commaSepValues" })).toEqual([]);
    expect(
      parseCss(`hello, yes, "no, maybe", 'I dunno, can you', what`, {
        startRule: "commaSepValues",
      })
    ).toEqual(["hello", "yes", `"no, maybe"`, `'I dunno, can you'`, "what"]);
    expect(
      parseCss(
        "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(39, 46, 48, 1) 0%, rgba(14, 14, 14, 1) 100%), radial-gradient(ellipse 50% 50% at 50% 50%, rgba(39, 46, 48, 1) 0%, rgba(14, 14, 14, 1) 100%)",
        { startRule: "commaSepValues" }
      )
    ).toEqual([
      "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(39, 46, 48, 1) 0%, rgba(14, 14, 14, 1) 100%)",
      "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(39, 46, 48, 1) 0%, rgba(14, 14, 14, 1) 100%)",
    ]);
    expect(
      parseCss(`url("what is, linear(gradient, okay), whatevs"), yup`, {
        startRule: "commaSepValues",
      })
    ).toEqual([`url("what is, linear(gradient, okay), whatevs")`, "yup"]);
    expect(
      parseCss(`yes, (where do we (go, and), nobody (knows, and) so), on`, {
        startRule: "commaSepValues",
      })
    ).toEqual(["yes", "(where do we (go, and), nobody (knows, and) so)", "on"]);
  });
});
