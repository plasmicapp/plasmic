import { _migrationOnlyUtil } from "@/wab/shared/core/transform-utils";
import {
  CssTransform,
  CssTransforms,
  RotateTransform,
  ScaleTransform,
  SkewTransform,
  TranslateTransform,
  has3dComponent,
  parseOrigin,
} from "@/wab/shared/css/transforms";

describe("CssTransform", () => {
  describe("fromCss", () => {
    it("should parse translate functions", () => {
      (
        [
          {
            css: "translateX(10px)",
            structured: new TranslateTransform("10px", "0px", "0px"),
            invertible: false,
          },

          {
            css: "translateY(20px)",
            structured: new TranslateTransform("0px", "20px", "0px"),
            invertible: false,
          },

          {
            css: "translateZ(30px)",
            structured: new TranslateTransform("0px", "0px", "30px"),
            invertible: false,
          },

          {
            css: "translate(10px, 20px)",
            structured: new TranslateTransform("10px", "20px", "0px"),
            invertible: false,
          },

          {
            css: "translate3d(10px, 20px, 30px)",
            structured: new TranslateTransform("10px", "20px", "30px"),
            invertible: true,
          },
        ] as const
      ).map(({ css, structured, invertible }) => {
        expect(CssTransform.fromCss(css)).toEqual(structured);
        if (invertible) {
          expect(CssTransform.fromCss(css)?.showCss()).toEqual(css);
        }
      });
    });

    it("should parse rotate functions", () => {
      (
        [
          {
            css: "rotate(45deg)",
            structured: new RotateTransform("0", "0", "1", "45deg"),
            invertible: false,
          },

          {
            css: "rotateX(45deg)",
            structured: new RotateTransform("1", "0", "0", "45deg"),
            invertible: false,
          },

          {
            css: "rotateY(30deg)",
            structured: new RotateTransform("0", "1", "0", "30deg"),
            invertible: false,
          },

          {
            css: "rotateZ(45deg)",
            structured: new RotateTransform("0", "0", "1", "45deg"),
            invertible: false,
          },

          {
            css: "rotate3d(1, 0, 0, 45deg)",
            structured: new RotateTransform("1", "0", "0", "45deg"),
            invertible: true,
          },
        ] as const
      ).map(({ css, structured, invertible }) => {
        expect(CssTransform.fromCss(css)).toEqual(structured);
        if (invertible) {
          expect(CssTransform.fromCss(css)?.showCss()).toEqual(css);
        }
      });
    });

    it("should parse scale functions", () => {
      (
        [
          {
            css: "scaleX(1.5)",
            structured: new ScaleTransform("1.5", "1", "1"),
            invertible: false,
          },

          {
            css: "scaleY(2)",
            structured: new ScaleTransform("1", "2", "1"),
            invertible: false,
          },

          {
            css: "scaleZ(0.5)",
            structured: new ScaleTransform("1", "1", "0.5"),
            invertible: false,
          },

          {
            css: "scale(1.5, 2)",
            structured: new ScaleTransform("1.5", "2", "1"),
            invertible: false,
          },

          {
            css: "scale(2)",
            structured: new ScaleTransform("2", "2", "1"),
            invertible: false,
          },

          {
            css: "scale3d(1.5, 2, 0.5)",
            structured: new ScaleTransform("1.5", "2", "0.5"),
            invertible: true,
          },
        ] as const
      ).map(({ css, structured, invertible }) => {
        expect(CssTransform.fromCss(css)).toEqual(structured);
        if (invertible) {
          expect(CssTransform.fromCss(css)?.showCss()).toEqual(css);
        }
      });
    });

    it("should parse skew functions", () => {
      (
        [
          {
            css: "skewX(10deg)",
            structured: new SkewTransform("10deg", "0deg"),
            invertible: false,
          },

          {
            css: "skewY(5deg)",
            structured: new SkewTransform("0deg", "5deg"),
            invertible: false,
          },

          {
            css: "skew(10deg, 5deg)",
            structured: new SkewTransform("10deg", "5deg"),
            invertible: true,
          },
        ] as const
      ).map(({ css, structured, invertible }) => {
        expect(CssTransform.fromCss(css)).toEqual(structured);
        if (invertible) {
          expect(CssTransform.fromCss(css)?.showCss()).toEqual(css);
        }
      });
    });

    it("should return null for empty string", () => {
      expect(CssTransform.fromCss("")).toBeNull();
    });

    it("should return null for 'none'", () => {
      expect(CssTransform.fromCss("none")).toBeNull();
    });
  });

  describe("showCss", () => {
    it("should output transform shorthands", () => {
      (
        [
          [
            new TranslateTransform("10px", "20px", "30px"),
            "translate3d(10px, 20px, 30px)",
          ],
          [
            new RotateTransform("0", "0", "1", "45deg"),
            "rotate3d(0, 0, 1, 45deg)",
          ],
          [
            new RotateTransform("0", "1", "0", "30deg"),
            "rotate3d(0, 1, 0, 30deg)",
          ],
          [
            new RotateTransform("1", "0", "0", "45deg"),
            "rotate3d(1, 0, 0, 45deg)",
          ],
          [new ScaleTransform("1.5", "2", "1"), "scale3d(1.5, 2, 1)"],
          [new SkewTransform("10deg", "5deg"), "skew(10deg, 5deg)"],
        ] as const
      ).map(([transform, expected]) => {
        expect(transform.showCss()).toBe(expected);
      });
    });
  });
});

describe("CssTransforms", () => {
  describe("fromCss", () => {
    it("should parse CSS transform strings", () => {
      (
        [
          [
            "",
            {
              perspective: undefined,
              transforms: [],
            },
          ],
          [
            "none",
            {
              perspective: undefined,
              transforms: [],
            },
          ],
          [
            "translateX(10px) translateY(20px)",
            {
              perspective: undefined,
              transforms: [
                new TranslateTransform("10px", "0px", "0px"),
                new TranslateTransform("0px", "20px", "0px"),
              ],
            },
          ],
          [
            "translateX(10px) rotateZ(45deg)",
            {
              perspective: undefined,
              transforms: [
                new TranslateTransform("10px", "0px", "0px"),
                new RotateTransform("0", "0", "1", "45deg"),
              ],
            },
          ],
          [
            "perspective(500px) translateX(10px)",
            {
              perspective: "500px",
              transforms: [new TranslateTransform("10px", "0px", "0px")],
            },
          ],
          [
            "translate(30px, 20px) rotate(20deg) rotate(20deg)",
            {
              perspective: undefined,
              transforms: [
                new TranslateTransform("30px", "20px", "0px"),
                new RotateTransform("0", "0", "1", "20deg"),
                new RotateTransform("0", "0", "1", "20deg"),
              ],
            },
          ],
        ] as const
      ).map(([input, expected]) => {
        const result = CssTransforms.fromCss(input);
        expect(result).toMatchObject(expected);
      });
    });
  });

  describe("showCss", () => {
    it("should output CSS transform strings", () => {
      (
        [
          [[], undefined, "none"],
          [
            [new TranslateTransform("10px", "20px", "30px")],
            undefined,
            "translate3d(10px, 20px, 30px)",
          ],
          [
            [
              new TranslateTransform("10px", "20px", "30px"),
              new RotateTransform("0", "0", "1", "45deg"),
            ],
            undefined,
            "translate3d(10px, 20px, 30px) rotate3d(0, 0, 1, 45deg)",
          ],
          [
            [new TranslateTransform("10px", "20px", "30px")],
            "500px",
            "perspective(500px) translate3d(10px, 20px, 30px)",
          ],
        ] as const
      ).map(([transformsList, perspective, expected]) => {
        const transforms = new CssTransforms([...transformsList], perspective);
        expect(transforms.showCss()).toBe(expected);
      });
    });
  });
});

describe("parseTransformOrigin", () => {
  it("should parse transform-origin values", () => {
    (
      [
        [
          "50% 50%",
          {
            left: "50%",
            top: "50%",
          },
        ],
        [
          "center center",
          {
            left: "50%",
            top: "50%",
          },
        ],
        [
          "left top",
          {
            left: "0%",
            top: "0%",
          },
        ],
        [
          "center",
          {
            left: "50%",
            top: "50%",
          },
        ],
        [
          "right bottom",
          {
            left: "100%",
            top: "100%",
          },
        ],
        [
          "",
          {
            left: undefined,
            top: undefined,
          },
        ],
      ] as const
    ).map(([input, expected]) => {
      const origin = parseOrigin(input);
      expect(origin).toEqual(expected);
    });
  });
});

// Migration Test Case

describe("Transform migration utilities", () => {
  it(`isZero function`, () => {
    const cases = [
      // unitless
      ["0", true],
      ["0.0", true],
      ["-0", true],
      // lengths / percentages
      ["0px", true],
      ["0%", true],
      ["-0%", true],
      ["10px", false],
      ["1%", false],
      // angles
      ["0deg", true],
      ["0rad", true],
      ["0grad", true],
      ["0turn", true],
      ["0.0001deg", false],
      // unsupported unit should be false even if zero
      ["0em", false],
      // whitespace & case
      ["  0PX  ", true],
    ] as const;

    cases.forEach(([input, expected]) => {
      expect(_migrationOnlyUtil.isZero(input)).toEqual(expected);
    });
  });

  it("normalizeGroupToCanonical function", () => {
    const cases = [
      // scale → scale3d
      ["scaleX(2) scaleY(1) scaleZ(1)", "scale3d(2, 1, 1)"],
      // translate → translate3d (+ defaults)
      ["translateX(10px)", "translate3d(10px, 0px, 0px)"],
      // skew → skew(x, y)
      ["skewX(10deg) skewY(0deg)", "skew(10deg, 0deg)"],
      // rotate single-axis preference (Z)
      [
        "rotateX(0deg) rotateY(0deg) rotateZ(45deg)",
        "rotate3d(0, 0, 1, 45deg)",
      ],
      // rotate single-axis fallback to X
      [
        "rotateX(10deg) rotateY(0deg) rotateZ(0deg)",
        "rotate3d(1, 0, 0, 10deg)",
      ],
      // multi-axis rotate → combine using quaternions into rotate3d
      [
        "rotateX(20deg) rotateY(30deg) rotateZ(45deg)",
        "rotate3d(0.497530, 0.337520, 0.799089, 60.9970deg)",
      ],
    ] as const;

    cases.forEach(([input, expected]) => {
      expect(
        _migrationOnlyUtil.normalizeSingleTransformTo3dFormat(input)
      ).toEqual(expected);
    });
  });

  it("migrateTransformsValue function", () => {
    const cases = [
      [
        // full $$$ example from spec
        "skewX(10deg) skewY(0deg)$$$rotateX(10deg) rotateY(0deg) rotateZ(0deg)$$$scaleX(2) scaleY(1) scaleZ(1)$$$rotateX(0deg) rotateY(0deg) rotateZ(45deg)$$$translateX(0px) translateY(20px) translateZ(30px)$$$translateX(10px) translateY(0px) translateZ(0px)",
        "skew(10deg, 0deg) rotate3d(1, 0, 0, 10deg) scale3d(2, 1, 1) rotate3d(0, 0, 1, 45deg) translate3d(0px, 20px, 30px) translate3d(10px, 0px, 0px)",
      ],
      [
        // spacing robustness
        "scaleX(2)   scaleY(3)$$$translateX(5px)",
        "scale3d(2, 3, 1) translate3d(5px, 0px, 0px)",
      ],
      [
        // empty string → unchanged
        "",
        "",
      ],
      [
        // whitespace-only → unchanged (migration returns as-is)
        "   ",
        "   ",
      ],
      [
        // multi-axis rotate group is now combined using quaternions within overall migration
        "rotateX(10deg) rotateY(20deg) rotateZ(30deg)$$$translateX(5px)",
        "rotate3d(0.386017, 0.438014, 0.811871, 38.6300deg) translate3d(5px, 0px, 0px)",
      ],
    ] as const;

    cases.forEach(([input, expected]) => {
      expect(_migrationOnlyUtil.migrateTransformsValue(input)).toEqual(
        expected
      );
    });
  });
});

describe("has3dComponent", () => {
  describe("perspective", () => {
    it("should return true for non-zero perspective", () => {
      expect(has3dComponent("perspective(500px)")).toBe(true);
      expect(has3dComponent("perspective(100px) translateX(10px)")).toBe(true);
    });

    it("should return false for zero or none perspective", () => {
      expect(has3dComponent("perspective(0px)")).toBe(false);
      expect(has3dComponent("perspective(none)")).toBe(false);
    });
  });

  describe("translate transforms", () => {
    it("should return true when Z value is non-zero", () => {
      expect(has3dComponent("translateZ(10px)")).toBe(true);
      expect(has3dComponent("translate3d(0px, 0px, 10px)")).toBe(true);
      expect(has3dComponent("translate3d(5px, 10px, 10%)")).toBe(true);
    });

    it("should return false when Z value is zero", () => {
      expect(has3dComponent("translate3d(10px, 20px, 0px)")).toBe(false);
      expect(has3dComponent("translate3d(10px, 20px, 0%)")).toBe(false);
    });
  });

  describe("rotate transforms", () => {
    it("should return true when angle is non-zero and both X and Y are non-zero", () => {
      expect(has3dComponent("rotate3d(1, 1, 0, 45deg)")).toBe(true);
      expect(has3dComponent("rotate3d(0.5, 0.5, 0, 30turn)")).toBe(true);
      expect(has3dComponent("rotate3d(2, 3, 0, 90rad)")).toBe(true);
    });

    it("should return false when angle is zero", () => {
      expect(has3dComponent("rotate3d(1, 1, 0, 0deg)")).toBe(false);
      expect(has3dComponent("rotate3d(1, 1, 0, 0turn)")).toBe(false);
      expect(has3dComponent("rotate3d(1, 1, 0, 0rad)")).toBe(false);
      expect(has3dComponent("rotate3d(1, 1, 0, 0grad)")).toBe(false);
    });

    it("should return false when X or Y is zero", () => {
      expect(has3dComponent("rotate3d(0, 1, 0, 45deg)")).toBe(false);
      expect(has3dComponent("rotate3d(1, 0, 0, 45deg)")).toBe(false);
    });
  });

  describe("scale transforms", () => {
    it("should return true when Z value is not 1", () => {
      expect(has3dComponent("scale3d(1, 1, 2)")).toBe(true);
      expect(has3dComponent("scale3d(2, 3, 0.5)")).toBe(true);
      expect(has3dComponent("scale3d(2, 3, 0)")).toBe(true);
    });

    it("should return false when Z value is 1", () => {
      expect(has3dComponent("scale3d(2, 3, 1)")).toBe(false);
    });
  });

  describe("skew transforms", () => {
    it("should always return false for skew transforms", () => {
      expect(has3dComponent("skew(0deg, 0deg)")).toBe(false);
      expect(has3dComponent("skew(10deg, 20deg)")).toBe(false);
      expect(has3dComponent("skew(10rad, 20rad)")).toBe(false);
    });
  });

  describe("multiple transforms", () => {
    it("should return true if any transform has 3D component", () => {
      expect(
        has3dComponent("translateX(10px) translateZ(5px) rotate(45deg)")
      ).toBe(true);
      expect(has3dComponent("scale(2) scaleZ(0.5) skew(10deg)")).toBe(true);
      expect(
        has3dComponent("perspective(500px) translateX(10px) rotate(45deg)")
      ).toBe(true);
    });

    it("should return false if no transform has 3D component", () => {
      expect(has3dComponent("translateX(10px) rotate(45deg) scale(2)")).toBe(
        false
      );
      expect(
        has3dComponent("translate(10px, 20px) rotateZ(45deg) skew(10deg)")
      ).toBe(false);
    });
  });
});
