import { parseCss } from "@/wab/shared/css";

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
