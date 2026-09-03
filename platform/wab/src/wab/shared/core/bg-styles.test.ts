import { tuple } from "@/wab/shared/common";
import {
  Background,
  BackgroundLayer,
  bgClipTextTag,
  BoxShadow,
  BoxShadows,
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
        rx: new Dim("60", "%"),
        ry: new Dim("40", "%"),
        cx: new Dim("20", "%"),
        cy: new Dim("25", "%"),
        stops: tuple(
          new Stop("#e66465", new Dim("0", "%")),
          new Stop("#9198e5", new Dim("100", "%"))
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
        rx: new Dim("60", "%"),
        ry: new Dim("40", "%"),
        cx: new Dim("20", "%"),
        cy: new Dim("25", "%"),
        stops: tuple(
          new Stop("#e66465", new Dim("0", "%")),
          new Stop("#9198e5", new Dim("100", "%"))
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
        rx: new Dim("50", "%"),
        ry: new Dim("50", "%"),
        cx: new Dim("60", "%"),
        cy: new Dim("40", "px"),
        stops: tuple(
          new Stop("#e66465", new Dim("0", "%")),
          new Stop("#9198e5", new Dim("100", "%"))
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
        rx: new Dim("50", "%"),
        ry: new Dim("50", "%"),
        cx: new Dim("50", "%"),
        cy: new Dim("50", "%"),
        stops: [
          new Stop("cyan", new Dim("0", "%")),
          new Stop("transparent", new Dim("20", "%")),
          new Stop("salmon", new Dim("40", "%")),
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
    const gradientWithCalc = RadialGradient.fromCss(
      "radial-gradient(ellipse calc(50% + 10px) calc(50% - 10px) at 50% 50%, red 0%, blue 100%)"
    );
    expect(gradientWithCalc).not.toBeNull();
    if (gradientWithCalc) {
      // Should default to 50% 50% since calc is not supported in size
      expect(gradientWithCalc.rx.isCssFunction()).toBe(false);
      expect(gradientWithCalc.rx.getNumericValue()).toBe(50);
      expect(gradientWithCalc.ry.isCssFunction()).toBe(false);
      expect(gradientWithCalc.ry.getNumericValue()).toBe(50);
    }
  });

  it("should parse linear gradients fromCss", function () {
    expect(
      LinearGradient.fromCss("linear-gradient(90deg, black 50%, #fff 70%)")
    ).toEqual(
      new LinearGradient({
        repeating: false,
        angle: 90,
        stops: tuple(
          new Stop("black", new Dim("50", "%")),
          new Stop("#fff", new Dim("70", "%"))
        ),
      })
    );
    expect(LinearGradient.fromCss("linear-gradient(30deg, #fff 50%)")).toEqual(
      new LinearGradient({
        repeating: false,
        angle: 30,
        stops: [new Stop("#fff", new Dim("50", "%"))],
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
          new Stop("black", new Dim("50", "%")),
          new Stop("#fff", new Dim("70", "%"))
        ),
      })
    );
    expect(
      LinearGradient.fromCss("linear-gradient(10deg, rgb(0,0,0) 50%)")
    ).toEqual(
      new LinearGradient({
        repeating: false,
        angle: 10,
        stops: [new Stop("rgb(0,0,0)", new Dim("50", "%"))],
      })
    );
    expect(
      LinearGradient.fromCss(
        "repeating-linear-gradient(90deg, rgba(255,255,255,.1) 50%)"
      )
    ).toEqual(
      new LinearGradient({
        repeating: true,
        angle: 90,
        stops: [new Stop("rgba(255,255,255,.1)", new Dim("50", "%"))],
      })
    );
    expect(
      LinearGradient.fromCss("linear-gradient(45deg, red 0%, blue 100%)")
    ).toEqual(
      new LinearGradient({
        repeating: false,
        angle: 45,
        stops: tuple(
          new Stop("red", new Dim("0", "%")),
          new Stop("blue", new Dim("100", "%"))
        ),
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
            new Stop("black", new Dim("50", "%")),
            new Stop("#fff", new Dim("70", "%"))
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

    // parse background-size auto properly.
    expect(
      BackgroundLayer.fromCss(
        `linear-gradient(90deg, black 50%, #fff 70%) 10% 15px / auto auto repeat padding-box border-box local`
      )
    ).toEqual(
      new BackgroundLayer({
        image: new LinearGradient({
          repeating: false,
          angle: 90,
          stops: tuple(
            new Stop("black", new Dim("50", "%")),
            new Stop("#fff", new Dim("70", "%"))
          ),
        }),
        position: "10% 15px",
        size: "auto auto",
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
    expect(Dim.fromCss("20px")).toEqual(new Dim("20", "px"));
    expect(Dim.fromCss("20%")).toEqual(new Dim("20", "%"));
    expect(Dim.fromCss("20rem")).toEqual(new Dim("20", "rem"));
    expect(Dim.fromCss("calc(100% - 20px)")).toEqual(
      new Dim("calc(100% - 20px)")
    );
    expect(Dim.fromCss("min(50px, 10%)")).toEqual(new Dim("min(50px, 10%)"));
    expect(Dim.fromCss("max(100px, 50%)")).toEqual(new Dim("max(100px, 50%)"));
    expect(Dim.fromCss("clamp(10px, 50%, 100px)")).toEqual(
      new Dim("clamp(10px, 50%, 100px)")
    );
  });

  it("should handle setValue with CSS functions", function () {
    const dim = new Dim("50", "px");
    expect(dim.isCssFunction()).toBe(false);
    expect(dim.getNumericValue()).toBe(50);

    dim.setValue("calc(100% - 20px)");
    expect(dim.isCssFunction()).toBe(true);
    expect(dim.showCss()).toBe("calc(100% - 20px)");

    // Set back to a regular value
    dim.setValue("75px");
    expect(dim.isCssFunction()).toBe(false);
    expect(dim.getNumericValue()).toBe(75);
    expect(dim.unit).toBe("px");
  });

  it("should parse linear color stop fromCss", function () {
    expect(Stop.fromCss("#fff000 20px")).toEqual(
      new Stop("#fff000", new Dim("20", "px"))
    );
    /**
     * Since dim is a required field in the Stop, and it's necessary for the Studio functionality for now,
     * Also, we need to identify a missing dimension value using linearlyInterpolateMissingStopDimensions function,
     * hence we need this hack of using a particular identifier for denoting missing dimension
     */
    expect(Stop.fromCss("#fff000")).toEqual(
      new Stop("#fff000", new Dim("0", STOP_DIM_MISSING_IDENTIFIER))
    );
  });

  it("should ignore CSS dimension functions in radial gradients", function () {
    const gradient = RadialGradient.fromCss(
      "radial-gradient(ellipse calc(50% + 10px) calc(50% - 10px) at calc(30% + 5px) calc(40% - 5px), #e66465 0%, #9198e5 100%)"
    );
    expect(gradient).not.toBeNull();
    if (gradient) {
      // Size should default to 50% 50% since calc is not supported
      expect(gradient.rx.isCssFunction()).toBe(false);
      expect(gradient.rx.getNumericValue()).toBe(50);
      expect(gradient.ry.isCssFunction()).toBe(false);
      expect(gradient.ry.getNumericValue()).toBe(50);

      // Position should also default to 50% 50% since calc is not supported
      expect(gradient.cx.isCssFunction()).toBe(false);
      expect(gradient.cx.getNumericValue()).toBe(50);
      expect(gradient.cy.isCssFunction()).toBe(false);
      expect(gradient.cy.getNumericValue()).toBe(50);
    }
  });

  describe("parseStop - should handle linear-color-stop values", function () {
    it("should parse color stop with position", () => {
      const stop = Stop.fromCss("#fff000 20px");
      expect(stop).toEqual(new Stop("#fff000", new Dim("20", "px")));
    });

    it("should parse color stop with percentage", () => {
      const stop = Stop.fromCss("red 50%");
      expect(stop).toEqual(new Stop("red", new Dim("50", "%")));
    });

    it("should parse color stop without position using missing identifier", () => {
      const stop = Stop.fromCss("#fff000");
      expect(stop).toEqual(
        new Stop("#fff000", new Dim("0", STOP_DIM_MISSING_IDENTIFIER))
      );
    });

    it("should parse rgb color stop", () => {
      const stop = Stop.fromCss("rgb(255, 0, 0) 30%");
      expect(stop).toEqual(new Stop("rgb(255,0,0)", new Dim("30", "%")));
    });

    it("should parse rgba color stop", () => {
      const stop = Stop.fromCss("rgba(255, 0, 0, 0.5) 40px");
      expect(stop).toEqual(new Stop("rgba(255,0,0,0.5)", new Dim("40", "px")));
    });

    it("should ignore dims css functions (calc) in stop position", () => {
      const stop = Stop.fromCss("red calc(50% + 10px)");
      expect(stop).toEqual(
        new Stop("red", new Dim("0", STOP_DIM_MISSING_IDENTIFIER))
      );
    });
  });

  describe("parseLinearGradient - should handle linear gradients", function () {
    it("should parse basic linear gradient", () => {
      const gradient = LinearGradient.fromCss(
        "linear-gradient(90deg, black 50%, #fff 70%)"
      );
      expect(gradient).toEqual(
        new LinearGradient({
          repeating: false,
          angle: 90,
          stops: [
            new Stop("black", new Dim("50", "%")),
            new Stop("#fff", new Dim("70", "%")),
          ],
        })
      );
    });

    it("should parse repeating linear gradient", () => {
      const gradient = LinearGradient.fromCss(
        "repeating-linear-gradient(45deg, red 0%, blue 100%)"
      );
      expect(gradient).toEqual(
        new LinearGradient({
          repeating: true,
          angle: 45,
          stops: [
            new Stop("red", new Dim("0", "%")),
            new Stop("blue", new Dim("100", "%")),
          ],
        })
      );
    });

    it("should parse linear gradient without explicit angle (default 180deg)", () => {
      const gradient = LinearGradient.fromCss("linear-gradient(red, blue)");
      expect(gradient).toEqual(
        new LinearGradient({
          repeating: false,
          angle: 180,
          stops: [
            new Stop("red", new Dim("0", "%")),
            new Stop("blue", new Dim("100", "%")),
          ],
        })
      );
    });

    it("should parse linear gradient with color stops without positions", () => {
      const gradient = LinearGradient.fromCss(
        "linear-gradient(0deg, red, green, blue)"
      );
      expect(gradient).toEqual(
        new LinearGradient({
          repeating: false,
          angle: 0,
          stops: [
            new Stop("red", new Dim("0", "%")),
            new Stop("green", new Dim("50", "%")),
            new Stop("blue", new Dim("100", "%")),
          ],
        })
      );
    });

    it("should ignore dims css function (calc) in angle", () => {
      const gradient = LinearGradient.fromCss(
        "linear-gradient(calc(45deg + 10deg), red, blue)"
      );
      // Should use default angle 180deg since calc is not supported
      expect(gradient?.angle).toBe(180);
    });

    it("should parse linear gradient with rgb colors", () => {
      const gradient = LinearGradient.fromCss(
        "linear-gradient(10deg, rgb(0,0,0) 50%)"
      );
      expect(gradient).toEqual(
        new LinearGradient({
          repeating: false,
          angle: 10,
          stops: [new Stop("rgb(0,0,0)", new Dim("50", "%"))],
        })
      );
    });

    it("should parse linear gradient with rgba colors", () => {
      const gradient = LinearGradient.fromCss(
        "repeating-linear-gradient(90deg, rgba(255,255,255,.1) 50%)"
      );
      expect(gradient).toEqual(
        new LinearGradient({
          repeating: true,
          angle: 90,
          stops: [new Stop("rgba(255,255,255,.1)", new Dim("50", "%"))],
        })
      );
    });
  });

  describe("BackgroundLayer - should support CSS dimension functions", function () {
    describe("position", () => {
      it("should support dims css functions (calc) in background position", () => {
        const layer = BackgroundLayer.fromCss(
          "linear-gradient(90deg, red, blue) calc(50% + 10px) calc(50% - 10px)"
        );
        expect(layer).not.toBeNull();
        if (layer) {
          expect(layer.position).toBe("calc(50% + 10px) calc(50% - 10px)");
        }
      });

      it("should support mixed position with keywords and calc()", () => {
        const layer = BackgroundLayer.fromCss(
          "radial-gradient(red, blue) left calc(10% + 5px) top calc(20% - 10px)"
        );
        expect(layer).not.toBeNull();
        if (layer) {
          expect(layer.position).toBe(
            "left calc(10% + 5px) top calc(20% - 10px)"
          );
        }
      });

      it("should support nested functions in background position", () => {
        const layer = BackgroundLayer.fromCss(
          "linear-gradient(90deg, red, blue) min(calc(50% + 10px), 100px) max(calc(30% - 5px), 50px)"
        );
        expect(layer).not.toBeNull();
        if (layer) {
          expect(layer.position).toBe(
            "min(calc(50% + 10px),100px) max(calc(30% - 5px),50px)"
          );
        }
      });
    });

    describe("size", () => {
      it("should support dims css functions (min) in background size", () => {
        const layer = BackgroundLayer.fromCss(
          "radial-gradient(red, blue) 0% 0% / min(100%, 500px) min(80%, 400px)"
        );
        expect(layer).not.toBeNull();
        if (layer) {
          expect(layer.size).toBe("min(100%,500px) min(80%,400px)");
        }
      });

      it("should support single value size with calc()", () => {
        const layer = BackgroundLayer.fromCss(
          "linear-gradient(red, blue) 0% 0% / calc(100% / 3)"
        );
        expect(layer).not.toBeNull();
        if (layer) {
          expect(layer.size).toBe("calc(100%/3)");
        }
      });

      it("should support keywords mixed with calc() in size", () => {
        const layer = BackgroundLayer.fromCss(
          "linear-gradient(red, blue) 0% 0% / calc(100% - 50px) auto"
        );
        expect(layer).not.toBeNull();
        if (layer) {
          expect(layer.size).toBe("calc(100% - 50px) auto");
        }
      });

      it("should support nested functions in background size", () => {
        const layer = BackgroundLayer.fromCss(
          "radial-gradient(red, blue) 0% 0% / min(calc(100% - 20px), 500px) max(calc(50% + 10px), 200px)"
        );
        expect(layer).not.toBeNull();
        if (layer) {
          expect(layer.size).toBe(
            "min(calc(100% - 20px),500px) max(calc(50% + 10px),200px)"
          );
        }
      });
    });

    describe("combined position and size", () => {
      it("should parse complete background with both position and size using calc()", () => {
        const layer = BackgroundLayer.fromCss(
          "radial-gradient(ellipse 50% 50% at 50% 50%, #ffecd2 0%, #fcb69f 100%) left calc(0% + 5px) top calc(33px - 3px) / calc(20px * 2) calc(30px + 10px)"
        );
        expect(layer).not.toBeNull();
        if (layer) {
          expect(layer.position).toBe(
            "left calc(0% + 5px) top calc(33px - 3px)"
          );
          expect(layer.size).toBe("calc(20px*2) calc(30px + 10px)");
        }
      });

      it("should parse image background with min/max in position and size", () => {
        const layer = BackgroundLayer.fromCss(
          'url("test.png") min(50%, 200px) max(30%, 100px) / min(100%, 500px) max(80%, 400px)'
        );
        expect(layer).not.toBeNull();
        if (layer) {
          expect(layer.position).toBe("min(50%,200px) max(30%,100px)");
          expect(layer.size).toBe("min(100%,500px) max(80%,400px)");
        }
      });

      it("should parse gradient with clamp() in both position and size", () => {
        const layer = BackgroundLayer.fromCss(
          "linear-gradient(90deg, red, blue) clamp(0%, 10%, 20%) clamp(0%, 5%, 10%) / clamp(50px, 50%, 500px) clamp(30px, 30%, 300px)"
        );
        expect(layer).not.toBeNull();
        if (layer) {
          expect(layer.position).toBe("clamp(0%,10%,20%) clamp(0%,5%,10%)");
          expect(layer.size).toBe(
            "clamp(50px,50%,500px) clamp(30px,30%,300px)"
          );
        }
      });
    });
  });

  describe("parseRadialGradient - should handle radial gradients", function () {
    it("should parse basic radial gradient with ellipse size", () => {
      const gradient = RadialGradient.fromCss(
        "radial-gradient(ellipse 60% 40% at 20% 25%, #e66465 0%, #9198e5 100%)"
      );
      expect(gradient).toEqual(
        new RadialGradient({
          repeating: false,
          rx: new Dim("60", "%"),
          ry: new Dim("40", "%"),
          cx: new Dim("20", "%"),
          cy: new Dim("25", "%"),
          stops: [
            new Stop("#e66465", new Dim("0", "%")),
            new Stop("#9198e5", new Dim("100", "%")),
          ],
          sizeKeyword: undefined,
        })
      );
    });

    it("should parse repeating radial gradient", () => {
      const gradient = RadialGradient.fromCss(
        "repeating-radial-gradient(ellipse 60% 40% at 20% 25%, #e66465 0%, #9198e5 100%)"
      );
      expect(gradient).toEqual(
        new RadialGradient({
          repeating: true,
          rx: new Dim("60", "%"),
          ry: new Dim("40", "%"),
          cx: new Dim("20", "%"),
          cy: new Dim("25", "%"),
          stops: [
            new Stop("#e66465", new Dim("0", "%")),
            new Stop("#9198e5", new Dim("100", "%")),
          ],
          sizeKeyword: undefined,
        })
      );
    });

    it("should parse radial gradient with size keyword", () => {
      const gradient = RadialGradient.fromCss(
        "radial-gradient(farthest-corner at 60% 40px, #e66465 0%, #9198e5 100%)"
      );
      expect(gradient).toEqual(
        new RadialGradient({
          repeating: false,
          rx: new Dim("50", "%"),
          ry: new Dim("50", "%"),
          cx: new Dim("60", "%"),
          cy: new Dim("40", "px"),
          stops: [
            new Stop("#e66465", new Dim("0", "%")),
            new Stop("#9198e5", new Dim("100", "%")),
          ],
          sizeKeyword: "farthest-corner",
        })
      );
    });

    it("should parse radial gradient with only color stops (defaults)", () => {
      const gradient = RadialGradient.fromCss(
        "radial-gradient(cyan 0%, transparent 20%, salmon 40%)"
      );
      expect(gradient).toEqual(
        new RadialGradient({
          repeating: false,
          rx: new Dim("50", "%"),
          ry: new Dim("50", "%"),
          cx: new Dim("50", "%"),
          cy: new Dim("50", "%"),
          stops: [
            new Stop("cyan", new Dim("0", "%")),
            new Stop("transparent", new Dim("20", "%")),
            new Stop("salmon", new Dim("40", "%")),
          ],
          sizeKeyword: undefined,
        })
      );
    });

    it("should ignore dims css functions (calc) in radial size", () => {
      const gradient = RadialGradient.fromCss(
        "radial-gradient(ellipse calc(50% + 10px) calc(50% - 10px) at 50% 50%, #e66465 0%, #9198e5 100%)"
      );
      expect(gradient).not.toBeNull();
      if (gradient) {
        // Size should default to 50% 50% since calc is not supported
        expect(gradient.rx.isCssFunction()).toBe(false);
        expect(gradient.rx.getNumericValue()).toBe(50);
        expect(gradient.ry.isCssFunction()).toBe(false);
        expect(gradient.ry.getNumericValue()).toBe(50);
      }
    });

    it("should ignore dims css functions (calc) in radial position", () => {
      const gradient = RadialGradient.fromCss(
        "radial-gradient(ellipse 50% 50% at calc(50% + 10px) calc(50% - 10px), red 0%, blue 100%)"
      );
      expect(gradient).not.toBeNull();
      if (gradient) {
        // Position should default to 50% 50% since calc is not supported
        expect(gradient.cx.isCssFunction()).toBe(false);
        expect(gradient.cx.getNumericValue()).toBe(50);
        expect(gradient.cy.isCssFunction()).toBe(false);
        expect(gradient.cy.getNumericValue()).toBe(50);
      }
    });
  });

  describe("parseBoxShadow - should handle box-shadow properties", function () {
    it("should parse basic box shadow with all values", () => {
      const shadows = BoxShadows.fromCss("2px 4px 6px 8px #ff0000");
      expect(shadows.shadows).toHaveLength(1);
      expect(shadows.shadows[0]).toEqual(
        new BoxShadow({
          inset: false,
          x: new Dim("2", "px"),
          y: new Dim("4", "px"),
          blur: new Dim("6", "px"),
          spread: new Dim("8", "px"),
          color: "#ff0000",
        })
      );
    });

    it("should parse box shadow with inset", () => {
      const shadows = BoxShadows.fromCss("inset 2px 4px 6px 8px red");
      expect(shadows.shadows).toHaveLength(1);
      expect(shadows.shadows[0]).toEqual(
        new BoxShadow({
          inset: true,
          x: new Dim("2", "px"),
          y: new Dim("4", "px"),
          blur: new Dim("6", "px"),
          spread: new Dim("8", "px"),
          color: "red",
        })
      );
    });

    it("should parse box shadow with rgb color", () => {
      const shadows = BoxShadows.fromCss("2px 4px rgb(255, 0, 0)");
      expect(shadows.shadows).toHaveLength(1);
      expect(shadows.shadows[0]).toEqual(
        new BoxShadow({
          inset: false,
          x: new Dim("2", "px"),
          y: new Dim("4", "px"),
          blur: new Dim("0", "px"),
          spread: new Dim("0", "px"),
          color: "rgb(255,0,0)",
        })
      );
    });

    it("should parse box shadow with rgba color", () => {
      const shadows = BoxShadows.fromCss("2px 4px 6px rgba(0, 0, 0, 0.5)");
      expect(shadows.shadows).toHaveLength(1);
      expect(shadows.shadows[0]).toEqual(
        new BoxShadow({
          inset: false,
          x: new Dim("2", "px"),
          y: new Dim("4", "px"),
          blur: new Dim("6", "px"),
          spread: new Dim("0", "px"),
          color: "rgba(0,0,0,0.5)",
        })
      );
    });

    it("should parse multiple box shadows", () => {
      const shadows = BoxShadows.fromCss("2px 4px #fff, 0px 3px rgb(0,0,0)");
      expect(shadows.shadows).toHaveLength(2);
      expect(shadows.shadows[0]).toEqual(
        new BoxShadow({
          inset: false,
          x: new Dim("2", "px"),
          y: new Dim("4", "px"),
          blur: new Dim("0", "px"),
          spread: new Dim("0", "px"),
          color: "#fff",
        })
      );
      expect(shadows.shadows[1]).toEqual(
        new BoxShadow({
          inset: false,
          x: new Dim("0", "px"),
          y: new Dim("3", "px"),
          blur: new Dim("0", "px"),
          spread: new Dim("0", "px"),
          color: "rgb(0,0,0)",
        })
      );
    });

    it("should parse box shadow with default currentcolor", () => {
      const shadows = BoxShadows.fromCss("2px 4px 6px");
      expect(shadows.shadows).toHaveLength(1);
      expect(shadows.shadows[0].color).toBe("currentcolor");
    });

    it("should support dims css functions (min) in box shadow dimensions", () => {
      const shadows = BoxShadows.fromCss("min(2px, 5px) 4px 6px 8px #ff0000");
      expect(shadows.shadows).toHaveLength(1);
      expect(shadows.shadows[0].x.isCssFunction()).toBe(true);
      expect(shadows.shadows[0].x.showCss()).toBe("min(2px,5px)");
    });

    it("should handle mixed regular and function values", () => {
      const shadows = BoxShadows.fromCss(
        "calc(2px + 1px) 4px min(6px, 10px) max(8px, 12px) rgba(255, 0, 0, 0.5)"
      );
      expect(shadows.shadows).toHaveLength(1);
      const shadow = shadows.shadows[0];
      expect(shadow.x.isCssFunction()).toBe(true);
      expect(shadow.x.showCss()).toBe("calc(2px + 1px)");
      expect(shadow.y.isCssFunction()).toBe(false);
      expect(shadow.y.getNumericValue()).toBe(4);
      expect(shadow.blur.isCssFunction()).toBe(true);
      expect(shadow.blur.showCss()).toBe("min(6px,10px)");
      expect(shadow.spread.isCssFunction()).toBe(true);
      expect(shadow.spread.showCss()).toBe("max(8px,12px)");
    });
  });
});
