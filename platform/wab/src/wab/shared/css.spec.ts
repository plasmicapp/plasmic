import { expandGapProperty, parseCss } from "@/wab/shared/css";

describe("parseCss", () => {
  it("parse box-shadow string properly into the 4 lengths + color format", () => {
    expect(
      parseCss("2px 4px 6px 8px rgba(10,20,30,0.5)", {
        startRule: "boxShadows",
      }).showCss()
    ).toBe("2px 4px 6px 8px rgba(10,20,30,0.5)");

    // handle missing blur and spread case with rgba
    expect(
      parseCss("2px 4px rgba(0,0,0,0.2)", { startRule: "boxShadows" }).showCss()
    ).toBe("2px 4px 0px 0px rgba(0,0,0,0.2)");

    // handle rgb and rgba properly
    expect(
      parseCss("2px 4px rgba(0,0,0,0.2)", { startRule: "boxShadows" }).showCss()
    ).toBe("2px 4px 0px 0px rgba(0,0,0,0.2)");
    expect(
      parseCss("2px 4px rgb(0,0,0,0.2)", { startRule: "boxShadows" }).showCss()
    ).toBe("2px 4px 0px 0px rgb(0,0,0,0.2)");

    // prioritize the first occurrence of hex, rgba or token as a color
    expect(
      parseCss("1px 2px #fff111 rgba(0,0,0,0.5) var(--token-abc)", {
        startRule: "boxShadows",
      }).showCss()
    ).toBe("1px 2px 0px 0px #fff111");
    expect(
      parseCss("1px 2px var(--token-abc) #fff111 rgba(0,0,0,0.5)", {
        startRule: "boxShadows",
      }).showCss()
    ).toBe("1px 2px 0px 0px var(--token-abc)");
    expect(
      parseCss("1px 2px rgba(0,0,0,0.5) var(--token-abc) #fff111", {
        startRule: "boxShadows",
      }).showCss()
    ).toBe("1px 2px 0px 0px rgba(0,0,0,0.5)");

    // defaults to currentcolor when no color is present
    expect(
      parseCss("1px 2px 3px 4px", { startRule: "boxShadows" }).showCss()
    ).toBe("1px 2px 3px 4px currentcolor");

    // treats var(...) as the color if no rgba() was observed
    expect(
      parseCss("3px 4px 2px 10px var(--token-abc)", {
        startRule: "boxShadows",
      }).showCss()
    ).toBe("3px 4px 2px 10px var(--token-abc)");
    expect(
      parseCss("var(--token-abc) 5px 6px", {
        startRule: "boxShadows",
      }).showCss()
    ).toBe("5px 6px 0px 0px var(--token-abc)");

    // detects inset anywhere and preserves its position up front
    expect(
      parseCss("inset 1px 2px 3px 4px rgba(1,2,3,0.3)", {
        startRule: "boxShadows",
      }).showCss()
    ).toBe("inset 1px 2px 3px 4px rgba(1,2,3,0.3)");
    expect(
      parseCss("1px 2px inset 3px 4px rgba(0,0,0,1)", {
        startRule: "boxShadows",
      }).showCss()
    ).toBe("inset 1px 2px 3px 4px rgba(0,0,0,1)");

    // ignores extra tokens that aren’t dim/rgba/var/inset
    expect(
      parseCss("foo 1px 2px rgba(0,0,0,0.4) bar", {
        startRule: "boxShadows",
      }).showCss()
    ).toBe("1px 2px 0px 0px rgba(0,0,0,0.4)");

    // handles negative and decimal lengths
    expect(
      parseCss("-1.5em 0px 2.25px rgba(255,255,255,0.8)", {
        startRule: "boxShadows",
      }).showCss()
    ).toBe("-1.5em 0px 2.25px 0px rgba(255,255,255,0.8)");

    // handles multiple box shadows properly
    expect(
      parseCss(
        "2px 4px rgba(10,20,30,0.5), inset var(--token-abc) 1px 2px 3px",
        { startRule: "boxShadows" }
      ).showCss()
    ).toBe(
      "2px 4px 0px 0px rgba(10,20,30,0.5), inset 1px 2px 3px 0px var(--token-abc)"
    );

    expect(
      parseCss("2px 4px 6px 8px #fff111, 1px 2px rgba(0,0,0,0.2)", {
        startRule: "boxShadows",
      }).showCss()
    ).toBe("2px 4px 6px 8px #fff111, 1px 2px 0px 0px rgba(0,0,0,0.2)");
  });
});

describe("expandGapProperty", () => {
  describe("flexbox layouts", () => {
    it("expands single value to both row and column gap", () => {
      expect(expandGapProperty("10px", false)).toEqual({
        rowGap: "10px",
        columnGap: "10px",
      });
    });

    it("expands single value with different units", () => {
      expect(expandGapProperty("1rem", false)).toEqual({
        rowGap: "1rem",
        columnGap: "1rem",
      });

      expect(expandGapProperty("2em", false)).toEqual({
        rowGap: "2em",
        columnGap: "2em",
      });

      expect(expandGapProperty("5%", false)).toEqual({
        rowGap: "5%",
        columnGap: "5%",
      });
    });

    it("expands two values to separate row and column gaps", () => {
      expect(expandGapProperty("10px 20px", false)).toEqual({
        rowGap: "10px",
        columnGap: "20px",
      });
    });

    it("expands two values with different units", () => {
      expect(expandGapProperty("1rem 2em", false)).toEqual({
        rowGap: "1rem",
        columnGap: "2em",
      });

      expect(expandGapProperty("15px 5%", false)).toEqual({
        rowGap: "15px",
        columnGap: "5%",
      });
    });

    it("handles CSS variables", () => {
      expect(expandGapProperty("var(--gap-size)", false)).toEqual({
        rowGap: "var(--gap-size)",
        columnGap: "var(--gap-size)",
      });

      expect(expandGapProperty("var(--row-gap) var(--col-gap)", false)).toEqual(
        {
          rowGap: "var(--row-gap)",
          columnGap: "var(--col-gap)",
        }
      );
    });
  });

  describe("grid layouts", () => {
    it("expands single value to both grid row and column gap", () => {
      expect(expandGapProperty("15px", true)).toEqual({
        gridRowGap: "15px",
        gridColumnGap: "15px",
      });
    });

    it("expands single value with different units", () => {
      expect(expandGapProperty("2rem", true)).toEqual({
        gridRowGap: "2rem",
        gridColumnGap: "2rem",
      });

      expect(expandGapProperty("1.5em", true)).toEqual({
        gridRowGap: "1.5em",
        gridColumnGap: "1.5em",
      });

      expect(expandGapProperty("10%", true)).toEqual({
        gridRowGap: "10%",
        gridColumnGap: "10%",
      });
    });

    it("expands two values to separate grid row and column gaps", () => {
      expect(expandGapProperty("20px 30px", true)).toEqual({
        gridRowGap: "20px",
        gridColumnGap: "30px",
      });
    });

    it("expands two values with different units", () => {
      expect(expandGapProperty("1.5rem 2.5em", true)).toEqual({
        gridRowGap: "1.5rem",
        gridColumnGap: "2.5em",
      });

      expect(expandGapProperty("25px 15%", true)).toEqual({
        gridRowGap: "25px",
        gridColumnGap: "15%",
      });
    });

    it("handles CSS variables in grid context", () => {
      expect(expandGapProperty("var(--grid-gap)", true)).toEqual({
        gridRowGap: "var(--grid-gap)",
        gridColumnGap: "var(--grid-gap)",
      });

      expect(
        expandGapProperty("var(--grid-row) var(--grid-col)", true)
      ).toEqual({
        gridRowGap: "var(--grid-row)",
        gridColumnGap: "var(--grid-col)",
      });
    });
  });
});
