import { parseBoxShadows } from "@/wab/client/web-importer/css-utils";

describe("parseBoxShadow", () => {
  it("parse box-shadow string properly into the 4 lengths + color format", () => {
    expect(parseBoxShadows("2px 4px 6px 8px rgba(10,20,30,0.5)")).toBe(
      "2px 4px 6px 8px rgba(10,20,30,0.5)"
    );

    // handle missing blur and spread case with rgba
    expect(parseBoxShadows("2px 4px rgba(0,0,0,0.2)")).toBe(
      "2px 4px 0px 0px rgba(0,0,0,0.2)"
    );

    // handle rgb and rgba properly
    expect(parseBoxShadows("2px 4px rgba(0,0,0,0.2)")).toBe(
      "2px 4px 0px 0px rgba(0,0,0,0.2)"
    );
    expect(parseBoxShadows("2px 4px rgb(0,0,0,0.2)")).toBe(
      "2px 4px 0px 0px rgb(0,0,0,0.2)"
    );

    // prioritize the first occurrence of rgba or token as a color
    expect(
      parseBoxShadows("1px 2px #fff111 rgba(0,0,0,0.5) var(--token-abc)")
    ).toBe("1px 2px 0px 0px #fff111");
    expect(
      parseBoxShadows("1px 2px var(--token-abc) #fff111 rgba(0,0,0,0.5)")
    ).toBe("1px 2px 0px 0px var(--token-abc)");
    expect(
      parseBoxShadows("1px 2px rgba(0,0,0,0.5) var(--token-abc) #fff111")
    ).toBe("1px 2px 0px 0px rgba(0,0,0,0.5)");

    // defaults to currentcolor when no color is present
    expect(parseBoxShadows("1px 2px 3px 4px")).toBe(
      "1px 2px 3px 4px currentcolor"
    );

    // treats var(...) as the color if no rgba() was observed
    expect(parseBoxShadows("3px 4px 2px 10px var(--token-abc)")).toBe(
      "3px 4px 2px 10px var(--token-abc)"
    );
    expect(parseBoxShadows("var(--token-abc) 5px 6px")).toBe(
      "5px 6px 0px 0px var(--token-abc)"
    );

    // detects inset anywhere and preserves its position up front
    expect(parseBoxShadows("inset 1px 2px 3px 4px rgba(1,2,3,0.3)")).toBe(
      "inset 1px 2px 3px 4px rgba(1,2,3,0.3)"
    );
    expect(parseBoxShadows("1px 2px inset 3px 4px rgba(0,0,0,1)")).toBe(
      "inset 1px 2px 3px 4px rgba(0,0,0,1)"
    );

    // ignores extra tokens that aren’t dim/rgba/var/inset
    expect(parseBoxShadows("foo 1px 2px rgba(0,0,0,0.4) bar")).toBe(
      "1px 2px 0px 0px rgba(0,0,0,0.4)"
    );

    // handles negative and decimal lengths
    expect(parseBoxShadows("-1.5em 0px 2.25px rgba(255,255,255,0.8)")).toBe(
      "-1.5em 0px 2.25px 0px rgba(255,255,255,0.8)"
    );
  });

  it("parse multiple box shadows properly", () => {
    expect(
      parseBoxShadows(
        "2px 4px rgba(10,20,30,0.5), inset var(--token-abc) 1px 2px 3px"
      )
    ).toBe(
      "2px 4px 0px 0px rgba(10,20,30,0.5), inset 1px 2px 3px 0px var(--token-abc)"
    );

    expect(
      parseBoxShadows("2px 4px 6px 8px #fff111, 1px 2px rgba(0,0,0,0.2)")
    ).toBe("2px 4px 6px 8px #fff111, 1px 2px 0px 0px rgba(0,0,0,0.2)");
  });
});
