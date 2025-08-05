import { translationTable } from "@/wab/client/web-importer/constants";
import {
  _testOnlyUtils,
  parseHtmlToWebImporterTree,
} from "@/wab/client/web-importer/html-parser";
import { WIElement } from "@/wab/client/web-importer/types";
import { TokenType } from "@/wab/commons/StyleToken";
import { toVarName } from "@/wab/shared/codegen/util";
import { assert } from "@/wab/shared/common";
import { createSite } from "@/wab/shared/core/sites";
import { TplMgr } from "@/wab/shared/TplMgr";
import { readFileSync } from "fs";
import path from "path";

const { fixCSSValue, renameTokenVarNameToUuid } = _testOnlyUtils;

describe("parseHtmlToWebImporterTree", () => {
  const site = createSite();

  it("parses a simple span with text", async () => {
    const html = "<span>plasmic</span>";
    const { wiTree: rootEl, fontDefinitions } =
      await parseHtmlToWebImporterTree(html, site);

    assert(rootEl, "rootEl should not be null");

    // no @font-face definitions or CSS variables
    expect(fontDefinitions).toEqual([]);

    // root is a container whose first child is the span we provided
    expect(rootEl).toMatchObject<Partial<WIElement>>({
      type: "container",
      tag: "div",
      children: [
        {
          type: "text",
          tag: "span",
          text: "plasmic",
          unsanitizedStyles: {},
          styles: {},
        },
      ],
      unsanitizedStyles: {},
      styles: {},
    });
  });

  it("extracts inline styles properly", async () => {
    const html =
      '<div style="display: flex; margin: 10px; color: #0000ff"><h1>Blue Heading 1</h1></div>';
    const { wiTree: rootEl } = await parseHtmlToWebImporterTree(html, site);

    assert(rootEl, "rootEl should not be null");

    expect(rootEl).toMatchObject<WIElement>({
      type: "container",
      tag: "div",
      attrs: {},
      children: [
        {
          type: "container",
          tag: "div",
          attrs: { style: "display: flex; margin: 10px; color: #0000ff" },
          children: [
            {
              type: "text",
              tag: "h1",
              text: "Blue Heading 1",
              unsanitizedStyles: {
                base: {
                  color: "rgb(0, 0, 255)",
                },
              },
              styles: {
                base: {
                  safe: {
                    color: "rgb(0, 0, 255)",
                  },
                  unsafe: {},
                },
              },
            },
          ],
          unsanitizedStyles: {
            base: {
              display: "flex",
              "flex-direction": "row",
              margin: "10px",
            },
          },
          styles: {
            base: {
              safe: {
                display: "flex",
                flexDirection: "row",
                marginTop: "10px",
                marginBottom: "10px",
                marginLeft: "10px",
                marginRight: "10px",
              },
              unsafe: {},
            },
          },
        },
      ],
      unsanitizedStyles: {},
      styles: {},
    });
  });

  it("extracts stylesheet styles properly", async () => {
    const html = `<style>
.container {
  display: flex;
  margin: 10px;
  color: #0000ff;
}

.heading {
  color: rgb(0,0,255);
}
</style>
<div class="container"><h1 class="heading">Blue Heading 1</h1></div>`;
    const { wiTree: rootEl } = await parseHtmlToWebImporterTree(html, site);

    assert(rootEl, "rootEl should not be null");

    expect(rootEl).toMatchObject<WIElement>({
      type: "container",
      tag: "div",
      attrs: {},
      children: [
        {
          type: "container",
          tag: "div",
          attrs: { class: "container" },
          children: [
            {
              type: "text",
              tag: "h1",
              text: "Blue Heading 1",
              unsanitizedStyles: {
                base: {
                  color: "rgb(0,0,255)",
                },
              },
              styles: {
                base: {
                  safe: {
                    color: "rgb(0,0,255)",
                  },
                  unsafe: {},
                },
              },
            },
          ],
          unsanitizedStyles: {
            base: {
              display: "flex",
              "flex-direction": "row",
              margin: "10px",
            },
          },
          styles: {
            base: {
              safe: {
                display: "flex",
                flexDirection: "row",
                marginTop: "10px",
                marginBottom: "10px",
                marginLeft: "10px",
                marginRight: "10px",
              },
              unsafe: {},
            },
          },
        },
      ],
      unsanitizedStyles: {},
      styles: {},
    });
  });

  it("parses an svg element with proper attributes", async () => {
    const svgElement = `<svg width="32px" height="32" viewBox="0 0 24 24" fill="#f3f3f3">
                            <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path>
                        </svg>`;
    const html = `<div>${svgElement}</div>`;

    const { wiTree: rootEl } = await parseHtmlToWebImporterTree(html, site);

    assert(rootEl, "rootEl should not be null");

    expect(rootEl).toMatchObject<Partial<WIElement>>({
      type: "container",
      tag: "div",
      children: [
        {
          type: "container",
          tag: "div",
          children: [
            {
              type: "svg",
              tag: "svg",
              outerHtml: svgElement,
              unsanitizedStyles: {},
              styles: {},
              width: "32px",
              height: "32px",
              fillColor: "#f3f3f3",
            },
          ],
          unsanitizedStyles: {},
          styles: {},
          attrs: {},
        },
      ],
      unsanitizedStyles: {},
      styles: {},
    });
  });
});

describe("renameTokenVarNameToUuid", () => {
  const site = createSite();
  const tplMgr = new TplMgr({ site });
  const colorPrimaryToken = tplMgr.addToken({
    tokenType: TokenType.Color,
    name: "Brand/Brand",
    value: "#3594F0",
  });
  const colorPrimaryForegroundToken = tplMgr.addToken({
    tokenType: TokenType.Color,
    name: "Neutral/Neutral",
    value: "#374151",
  });

  it("Rename token variable name to token uuid ", async () => {
    // "returns empty string for invalid token"
    expect(
      renameTokenVarNameToUuid("var(--token-unknown-token)", site)
    ).toBeNull();

    // "transform a valid token name to token uuid"
    expect(
      renameTokenVarNameToUuid(
        `var(--token-${toVarName(colorPrimaryToken.name)})`,
        site
      )
    ).toEqual(`var(--token-${colorPrimaryToken.uuid})`);

    // "transform multiple valid token names properly"
    expect(
      renameTokenVarNameToUuid(
        `linear-gradient(var(--token-${toVarName(
          colorPrimaryToken.name
        )}), var(--token-${toVarName(colorPrimaryForegroundToken.name)}))`,
        site
      )
    ).toEqual(
      `linear-gradient(var(--token-${colorPrimaryToken.uuid}), var(--token-${colorPrimaryForegroundToken.uuid}))`
    );

    // "return empty string if one of the tokens is invalid"
    expect(
      renameTokenVarNameToUuid(
        `linear-gradient(var(--token-unknown-token), var(--token-${toVarName(
          colorPrimaryForegroundToken.name
        )}))`,
        site
      )
    ).toBeNull();

    expect(
      renameTokenVarNameToUuid(`1px var(--token-border-color) solid`, site)
    ).toBeNull();
  });
});

describe("fixCSSValue", () => {
  it("returns empty object for empty value", () => {
    expect(fixCSSValue("color", "")).toEqual({});
  });

  it("returns empty object for key 'content'", () => {
    expect(fixCSSValue("content", "some text")).toEqual({});
  });

  it("extracts vh term from calc expression when present", () => {
    const res = fixCSSValue("width", "calc(10px + 2vh + 5vw)");
    expect(res).toEqual({ width: "2vh" });
  });

  it("extracts vw term from calc expression when no vh", () => {
    const res = fixCSSValue("height", "calc(10px + 3vw)");
    expect(res).toEqual({ height: "3vw" });
  });

  it("extracts px term from calc expression when no vh or vw", () => {
    const res = fixCSSValue("margin", "calc(4px + 5rem)");
    expect(res).toEqual({
      marginTop: "4px",
      marginRight: "4px",
      marginBottom: "4px",
      marginLeft: "4px",
    });
  });

  it("falls back to first term when calc has no px/vh/vw", () => {
    const res = fixCSSValue("height", "calc(5em*2)");
    expect(res).toEqual({ height: "5em" });
  });

  it("handles env(...) by taking fallback value", () => {
    const res = fixCSSValue("padding", "env(safe-area-inset, 20px)");
    expect(res).toEqual({
      paddingTop: "20px",
      paddingRight: "20px",
      paddingBottom: "20px",
      paddingLeft: "20px",
    });
  });

  it("transforms 'inline-flex' into 'flex'", () => {
    expect(fixCSSValue("display", "inline-flex")).toEqual({ display: "flex" });
  });

  it("strips '!important' suffix", () => {
    expect(fixCSSValue("color", "#ff00ff!important")).toEqual({
      color: "#ff00ff",
    });
  });

  it("transforms 'transparent' into rgba(0,0,0,0)", () => {
    expect(fixCSSValue("background-color", "transparent")).toEqual({
      background: "linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0))",
    });
  });

  it("expands border-color into individual side properties", () => {
    expect(fixCSSValue("border-color", "#fff000")).toEqual({
      borderTopColor: "#fff000",
      borderRightColor: "#fff000",
      borderBottomColor: "#fff000",
      borderLeftColor: "#fff000",
    });
  });

  it("expands border-style into individual side properties", () => {
    expect(fixCSSValue("border-style", "solid")).toEqual({
      borderTopStyle: "solid",
      borderRightStyle: "solid",
      borderBottomStyle: "solid",
      borderLeftStyle: "solid",
    });
  });

  it("expands border-width into individual side properties", () => {
    expect(fixCSSValue("border-width", "2px")).toEqual({
      borderTopWidth: "2px",
      borderRightWidth: "2px",
      borderBottomWidth: "2px",
      borderLeftWidth: "2px",
    });
  });

  it("expands border-radius into four corner properties", () => {
    expect(fixCSSValue("border-radius", "5px")).toEqual({
      borderTopLeftRadius: "5px",
      borderTopRightRadius: "5px",
      borderBottomRightRadius: "5px",
      borderBottomLeftRadius: "5px",
    });
  });

  it("returns property for overflowWrap when not 'break-word'", () => {
    expect(fixCSSValue("overflow-wrap", "anywhere")).toEqual({
      overflowWrap: "anywhere",
    });
  });

  it("expands padding shorthand with one value", () => {
    expect(fixCSSValue("padding", "10px")).toEqual({
      paddingTop: "10px",
      paddingRight: "10px",
      paddingBottom: "10px",
      paddingLeft: "10px",
    });
  });

  it("expands padding shorthand with two values", () => {
    expect(fixCSSValue("padding", "1px 2px")).toEqual({
      paddingTop: "1px",
      paddingRight: "2px",
      paddingBottom: "1px",
      paddingLeft: "2px",
    });
  });

  it("returns empty object for boxSizing", () => {
    expect(fixCSSValue("box-sizing", "border-box")).toEqual({});
  });

  it("expands margin shorthand with four values", () => {
    expect(fixCSSValue("margin", "10px")).toEqual({
      marginTop: "10px",
      marginRight: "10px",
      marginBottom: "10px",
      marginLeft: "10px",
    });

    expect(fixCSSValue("margin", "1px 2px 3px 4px")).toEqual({
      marginTop: "1px",
      marginRight: "2px",
      marginBottom: "3px",
      marginLeft: "4px",
    });
  });

  it("expands inset shorthand with two values", () => {
    expect(fixCSSValue("inset", "5px 10px")).toEqual({
      top: "5px",
      right: "10px",
      bottom: "5px",
      left: "10px",
    });
  });

  it("returns background gradient for backgroundColor with rgb or var or hex", () => {
    const rgb = "rgb(10,20,30)";
    expect(fixCSSValue("background-color", rgb)).toEqual({
      background: `linear-gradient(${rgb}, ${rgb})`,
    });

    const token = "var(--token-abc)";
    expect(fixCSSValue("background-color", token)).toEqual({
      background: `linear-gradient(${token}, ${token})`,
    });

    expect(fixCSSValue("background-color", "#fff")).toEqual({
      background: `linear-gradient(#fff, #fff)`,
    });
  });

  it("returns background gradient for background with rgb or var", () => {
    const rgb = "rgb(10,20,30)";
    expect(fixCSSValue("background", rgb)).toEqual({
      background: `linear-gradient(${rgb}, ${rgb})`,
    });

    const token = "var(--token-abc)";
    expect(fixCSSValue("background", token)).toEqual({
      background: token,
    });
  });

  it("returns empty object for background when not rgb", () => {
    expect(fixCSSValue("background", "url(image.png)")).toEqual({
      background: `url("image.png")`,
    });
  });

  it("parse box-shadow value properly", () => {
    expect(fixCSSValue("box-shadow", "5px 10px rgba(0,0,0,0.5)")).toEqual({
      boxShadow: "5px 10px 0px 0px rgba(0,0,0,0.5)",
    });
    expect(fixCSSValue("box-shadow", "rgba(0,0,0,0.5) 5px 10px")).toEqual({
      boxShadow: "5px 10px 0px 0px rgba(0,0,0,0.5)",
    });
    expect(
      fixCSSValue("box-shadow", "5px 10px 15px 20px rgba(0,0,0,0.5)")
    ).toEqual({
      boxShadow: "5px 10px 15px 20px rgba(0,0,0,0.5)",
    });

    // convert multiple box shadow properly
    expect(
      fixCSSValue(
        "box-shadow",
        "5px 10px rgba(0,0,0,0.5), rgba(0,0,0,0.5) 5px 10px"
      )
    ).toEqual({
      boxShadow:
        "5px 10px 0px 0px rgba(0,0,0,0.5), 5px 10px 0px 0px rgba(0,0,0,0.5)",
    });
  });

  it("return proper translated key if translation key is available", () => {
    const initialKeys = [
      "rowGap",
      "columnGap",
      "paddingInlineStart",
      "paddingInlineEnd",
    ];

    for (const key of initialKeys) {
      if (translationTable[key]) {
        expect(fixCSSValue(key, "10px")).toEqual({
          [translationTable[key]]: "10px",
        });
      }
    }
  });

  it("ensure camelCase key translation for any key", () => {
    expect(fixCSSValue("z-index", "100")).toEqual({ zIndex: "100" });
  });
});

describe("snapshot tests", () => {
  const site = createSite();

  it("parse landing page html properly", async () => {
    const landingPageFilePath = path.join(
      __dirname,
      "test/data/landing-page.html"
    );
    const landingPageHtml = readFileSync(landingPageFilePath, "utf8");

    const output = await parseHtmlToWebImporterTree(landingPageHtml, site);

    expect(output).toMatchSnapshot();
  });
});
