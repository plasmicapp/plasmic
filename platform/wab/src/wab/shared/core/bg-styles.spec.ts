import { tuple } from "@/wab/shared/common";
import {
  Background,
  BackgroundLayer,
  bgClipTextTag,
  ColorFill,
  Dim,
  ImageBackground,
  LinearGradient,
  NoneBackground,
  RadialGradient,
  Stop,
  STOP_DIM_MISSING_IDENTIFIER,
} from "@/wab/shared/core/bg-styles";

describe("bg-styles", function () {
  it("should parse image backgrounds using fromCss", () =>
    expect(ImageBackground.fromCss('url("http://aoeu")')).toEqual(
      new ImageBackground({ url: "http://aoeu" })
    ));

  it("should parse none backgrounds using fromCss", () =>
    expect(NoneBackground.fromCss("none")).toEqual(new NoneBackground()));

  it("should parse color fill backgrounds using fromCss", () => {
    expect(ColorFill.fromCss("black")).toEqual(
      new ColorFill({ color: "black" })
    );
    expect(ColorFill.fromCss("#fff000")).toEqual(
      new ColorFill({ color: "#fff000" })
    );
    expect(ColorFill.fromCss("linear-gradient(red, red)")).toEqual(
      new ColorFill({ color: "red" })
    );
    expect(ColorFill.fromCss("linear-gradient(red, blue)")).toEqual(null);
  });

  it("should parse radial gradients fromCss", function () {
    expect(
      RadialGradient.fromCss(
        "radial-gradient(ellipse 60% 40% at 20% 25%, #e66465 0%, #9198e5 100%)"
      )
    ).toEqual(
      new RadialGradient({
        repeating: false,
        rx: new Dim(60, "%"),
        ry: new Dim(40, "%"),
        cx: new Dim(20, "%"),
        cy: new Dim(25, "%"),
        stops: tuple(
          new Stop("#e66465", new Dim(0, "%")),
          new Stop("#9198e5", new Dim(100, "%"))
        ),
        sizeKeyword: undefined,
      })
    );
    expect(
      RadialGradient.fromCss(
        "repeating-radial-gradient(ellipse 60% 40% at 20% 25%, #e66465 0%, #9198e5 100%)"
      )
    ).toEqual(
      new RadialGradient({
        repeating: true,
        rx: new Dim(60, "%"),
        ry: new Dim(40, "%"),
        cx: new Dim(20, "%"),
        cy: new Dim(25, "%"),
        stops: tuple(
          new Stop("#e66465", new Dim(0, "%")),
          new Stop("#9198e5", new Dim(100, "%"))
        ),
        sizeKeyword: undefined,
      })
    );
    expect(
      RadialGradient.fromCss(
        `radial-gradient(farthest-corner at 60% 40px, #e66465 0%, #9198e5 100%)`
      )
    ).toEqual(
      new RadialGradient({
        repeating: false,
        rx: new Dim(50, "%"),
        ry: new Dim(50, "%"),
        cx: new Dim(60, "%"),
        cy: new Dim(40, "px"),
        stops: tuple(
          new Stop("#e66465", new Dim(0, "%")),
          new Stop("#9198e5", new Dim(100, "%"))
        ),
        sizeKeyword: "farthest-corner",
      })
    );
    expect(
      RadialGradient.fromCss(
        `radial-gradient(cyan 0%, transparent 20%, salmon 40%)`
      )
    ).toEqual(
      new RadialGradient({
        repeating: false,
        rx: new Dim(50, "%"),
        ry: new Dim(50, "%"),
        cx: new Dim(50, "%"),
        cy: new Dim(50, "%"),
        stops: [
          new Stop("cyan", new Dim(0, "%")),
          new Stop("transparent", new Dim(20, "%")),
          new Stop("salmon", new Dim(40, "%")),
        ],
        sizeKeyword: undefined,
      })
    );

    expect(
      RadialGradient.fromCss(
        "radial-gradient(ellipse 60% 40% at 20% 25%, #e66465 0%, #9198e5 100%)"
      )?.showCss()
    ).toEqual(
      "radial-gradient(ellipse 60% 40% at 20% 25%, #e66465 0%, #9198e5 100%)"
    );
    expect(
      RadialGradient.fromCss(
        `radial-gradient(cyan 0%, transparent 20%, salmon 40%)`
      )?.showCss()
    ).toEqual(
      `radial-gradient(ellipse 50% 50% at 50% 50%, cyan 0%, transparent 20%, salmon 40%)`
    );
    expect(
      RadialGradient.fromCss(
        `radial-gradient(closest-side, #3f87a6, #ebf8e1, #f69d3c)`
      )?.showCss()
    ).toEqual(
      `radial-gradient(closest-side at 50% 50%, #3f87a6 0%, #ebf8e1 50%, #f69d3c 100%)`
    );
  });

  it("should parse linear gradients fromCss", function () {
    expect(
      LinearGradient.fromCss("linear-gradient(90deg, black 50%, #fff 70%)")
    ).toEqual(
      new LinearGradient({
        repeating: false,
        angle: 90,
        stops: tuple(
          new Stop("black", new Dim(50, "%")),
          new Stop("#fff", new Dim(70, "%"))
        ),
      })
    );
    expect(LinearGradient.fromCss("linear-gradient(30deg, #fff 50%)")).toEqual(
      new LinearGradient({
        repeating: false,
        angle: 30,
        stops: [new Stop("#fff", new Dim(50, "%"))],
      })
    );
    expect(
      LinearGradient.fromCss(
        "repeating-linear-gradient(90deg, black 50%, #fff 70%)"
      )
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
    expect(
      LinearGradient.fromCss("linear-gradient(10deg, rgb(0,0,0) 50%)")
    ).toEqual(
      new LinearGradient({
        repeating: false,
        angle: 10,
        stops: [new Stop("rgb(0,0,0)", new Dim(50, "%"))],
      })
    );
    return expect(
      LinearGradient.fromCss(
        "repeating-linear-gradient(90deg, rgba(255,255,255,.1) 50%)"
      )
    ).toEqual(
      new LinearGradient({
        repeating: true,
        angle: 90,
        stops: [new Stop("rgba(255,255,255,.1)", new Dim(50, "%"))],
      })
    );
  });

  it("should parse background clip text properly", function () {
    const bgLayer1 = BackgroundLayer.fromCss(
      `url("http://localhost:3003/static/img/placeholder.png") 0% 0% padding-box text`
    );
    expect(bgLayer1).toEqual(
      new BackgroundLayer({
        image: new ImageBackground({
          url: "http://localhost:3003/static/img/placeholder.png",
        }),
        position: "0% 0%",
        origin: "padding-box",
        clip: "text",
      })
    );
    const bgLayer2 = BackgroundLayer.fromCss(
      `url("http://localhost:3003/static/img/placeholder.png") 0% 0% padding-box ${bgClipTextTag}`
    );
    expect(bgLayer2).toEqual(
      new BackgroundLayer({
        image: new ImageBackground({
          url: "http://localhost:3003/static/img/placeholder.png",
        }),
        position: "0% 0%",
        origin: "padding-box",
        clip: bgClipTextTag,
      })
    );

    [bgLayer1, bgLayer2].forEach((layer) => {
      expect(layer?.showCss()).toEqual(
        `url("http://localhost:3003/static/img/placeholder.png") 0% 0% padding-box ${bgClipTextTag}`
      );
    });
  });

  it("should parse BackgroundLayer fromCss", function () {
    expect(BackgroundLayer.fromCss("none")).toEqual(
      new BackgroundLayer({
        image: new NoneBackground(),
      })
    );

    expect(
      BackgroundLayer.fromCss(
        "linear-gradient(rgb(0,0,0), rgb(0,0,0)) 0% 0% padding-box border-box"
      )
    ).toEqual(
      new BackgroundLayer({
        image: new ColorFill({ color: "rgb(0,0,0)" }),
        position: "0% 0%",
        origin: "padding-box",
        clip: "border-box",
      })
    );

    const bgLayer = BackgroundLayer.fromCss(
      "linear-gradient(rgb(10,20,30), rgb(10,20,30))"
    );
    expect(bgLayer?.image?.showCss()).toEqual(
      `linear-gradient(rgb(10,20,30), rgb(10,20,30))`
    );

    const bgLayer1 = BackgroundLayer.fromCss(
      "linear-gradient(var(--token-abc), var(--token-abc))"
    );
    expect(bgLayer1?.image?.showCss()).toEqual(
      `linear-gradient(var(--token-abc), var(--token-abc))`
    );

    expect(
      BackgroundLayer.fromCss(
        `url("http://localhost:3003/static/img/placeholder.png") top 50% left 50% / cover repeat`
      )
    ).toEqual(
      new BackgroundLayer({
        image: new ImageBackground({
          url: "http://localhost:3003/static/img/placeholder.png",
        }),
        position: "top 50% left 50%",
        size: "cover",
        repeat: "repeat",
        origin: undefined,
        clip: undefined,
        attachment: undefined,
      })
    );

    expect(
      BackgroundLayer.fromCss(
        `url("img_tree.png") 10% 15px / 100px 20% repeat padding-box border-box local`
      )
    ).toEqual(
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

    expect(
      BackgroundLayer.fromCss(
        `linear-gradient(90deg, black 50%, #fff 70%) 10% 15px / 100px 20% repeat padding-box border-box local`
      )
    ).toEqual(
      new BackgroundLayer({
        image: new LinearGradient({
          repeating: false,
          angle: 90,
          stops: tuple(
            new Stop("black", new Dim(50, "%")),
            new Stop("#fff", new Dim(70, "%"))
          ),
        }),
        position: "10% 15px",
        size: "100px 20%",
        repeat: "repeat",
        origin: "padding-box",
        clip: "border-box",
        attachment: "local",
      })
    );
  });

  it("should parse Background fromCss", function () {
    expect(
      Background.fromCss(
        `linear-gradient(rgb(0,0,0), rgb(0,0,0)) 0% 0% padding-box ${bgClipTextTag}`
      )
    ).toEqual(
      new Background({
        layers: [
          new BackgroundLayer({
            image: new ColorFill({ color: "rgb(0,0,0)" }),
            position: "0% 0%",
            origin: "padding-box",
            clip: bgClipTextTag,
          }),
        ],
      })
    );

    expect(
      Background.fromCss(
        `linear-gradient(rgb(0,0,0), rgb(0,0,0)) 0% 0% padding-box ${bgClipTextTag}, url("img_tree.png") 10% 15px / 100px 20% repeat padding-box border-box local`
      )
    ).toEqual(
      new Background({
        layers: [
          new BackgroundLayer({
            image: new ColorFill({ color: "rgb(0,0,0)" }),
            position: "0% 0%",
            origin: "padding-box",
            clip: bgClipTextTag,
          }),
          new BackgroundLayer({
            image: new ImageBackground({ url: "img_tree.png" }),
            position: "10% 15px",
            size: "100px 20%",
            repeat: "repeat",
            origin: "padding-box",
            clip: "border-box",
            attachment: "local",
          }),
        ],
      })
    );
  });

  it("should parse Dim fromCss", function () {
    expect(Dim.fromCss("20px")).toEqual(new Dim(20, "px"));
    expect(Dim.fromCss("20%")).toEqual(new Dim(20, "%"));
    expect(Dim.fromCss("20rem")).toEqual(new Dim(20, "rem"));
  });

  it("should parse linear color stop fromCss", function () {
    expect(Stop.fromCss("#fff000 20px")).toEqual(
      new Stop("#fff000", new Dim(20, "px"))
    );
    /**
     * Since dim is a required field in the Stop, and it's necessary for the Studio functionality for now,
     * Also, we need to identify a missing dimension value using linearlyInterpolateMissingStopDimensions function,
     * hence we need this hack of using a particular identifier for denoting missing dimension
     */
    expect(Stop.fromCss("#fff000")).toEqual(
      new Stop("#fff000", new Dim(0, STOP_DIM_MISSING_IDENTIFIER))
    );
  });
});
