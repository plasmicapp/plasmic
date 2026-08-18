import { translationTable } from "@/wab/client/web-importer/constants";
import { WIError } from "@/wab/client/web-importer/errors";
import {
  _testOnlyUtils,
  parseHtmlToWebImporterTree,
  processUnsanitizedStyles,
} from "@/wab/client/web-importer/html-parser";
import { createComponentTestSite } from "@/wab/client/web-importer/testonly/utils";
import { WIElement } from "@/wab/client/web-importer/types";
import { TplMgr } from "@/wab/shared/TplMgr";
import { VariantGroupType } from "@/wab/shared/Variants";
import { toVarName } from "@/wab/shared/codegen/util";
import { assert } from "@/wab/shared/common";
import { createSite } from "@/wab/shared/core/sites";
import { Site } from "@/wab/shared/model/classes";
import { readFileSync } from "fs";
import path from "path";

// Test-friendly wrappers over the Result-based APIs: unwrap the Ok payload
// (throwing on Err) so assertions keep operating on the tree directly.
const parseHtml = async (html: string, site: Site) =>
  (await parseHtmlToWebImporterTree(html, site))._unsafeUnwrap();
const fixCSSValue = (key: string, value: string) =>
  _testOnlyUtils.fixCSSValue(key, value)._unsafeUnwrap();
const renameTokenVarNameToUuid = (value: string, site: Site) =>
  _testOnlyUtils.renameTokenVarNameToUuid(value, site, []);

describe("parseHtmlToWebImporterTree", () => {
  const site = createSite();

  it("parses a simple span with text", async () => {
    const html = "<span>plasmic</span>";
    const { wiTree: rootEl, fontDefinitions } = await parseHtml(html, site);

    assert(rootEl, "rootEl should not be null");

    // no @font-face definitions or CSS variables
    expect(fontDefinitions).toEqual([]);

    // root is a fragment whose first child is the span we provided
    expect(rootEl).toMatchObject<Partial<WIElement>>({
      type: "fragment",
      children: [
        {
          type: "text",
          path: expect.any(String),
          tag: "span",
          content: ["plasmic"],
          attrs: {},
          variantSettings: [],
        },
      ],
    });
  });

  it("imports links and paragraphs with inline markup as text elements", async () => {
    const html = `
      <a href="/pricing">See pricing</a>
      <p>Hello <strong>World</strong> and <a href="/x">a link</a>!</p>
    `;
    const { wiTree: rootEl } = await parseHtml(html, site);

    assert(rootEl, "rootEl should not be null");

    expect(rootEl).toMatchObject({
      type: "fragment",
      children: [
        {
          type: "text",
          tag: "a",
          content: ["See pricing"],
          attrs: { href: "/pricing" },
        },
        {
          type: "text",
          tag: "p",
          content: [
            "Hello ",
            { type: "text", tag: "strong", content: ["World"] },
            " and ",
            {
              type: "text",
              tag: "a",
              content: ["a link"],
              attrs: { href: "/x" },
            },
            "!",
          ],
        },
      ],
    });
  });

  it("collapses source formatting whitespace in rich text content", async () => {
    const html = "<p>\n      Hello\n      <strong>World</strong>\n    </p>";
    const { wiTree: rootEl } = await parseHtml(html, site);

    assert(rootEl, "rootEl should not be null");

    expect(rootEl).toMatchObject({
      type: "fragment",
      children: [
        {
          type: "text",
          tag: "p",
          content: ["Hello ", { type: "text", content: ["World"] }],
        },
      ],
    });
  });

  it("keeps line breaks and indentation inside pre", async () => {
    // The newline right after <pre> is dropped by the HTML parser itself;
    // everything else is preserved, including the nested tag's spacing.
    const html = "<pre>\nconst x = 1;\n  <em>indented</em>\n</pre>";
    const { wiTree: rootEl } = await parseHtml(html, site);

    assert(rootEl, "rootEl should not be null");

    expect(rootEl).toMatchObject({
      type: "fragment",
      children: [
        {
          type: "text",
          tag: "pre",
          content: [
            "const x = 1;\n  ",
            { type: "text", tag: "em", content: ["indented"] },
            "\n",
          ],
        },
      ],
    });
  });

  it("keeps line breaks inside pre even when pre imports as a container", async () => {
    // display:flex sends the pre down the container path; its text (bare
    // or inside a nested span) must still keep its whitespace.
    const html = '<pre style="display: flex"><span>a\nb</span>c\nd</pre>';
    const { wiTree: rootEl } = await parseHtml(html, site);

    assert(rootEl, "rootEl should not be null");

    expect(rootEl).toMatchObject({
      type: "fragment",
      children: [
        {
          type: "container",
          tag: "pre",
          children: [
            { type: "text", tag: "span", content: ["a\nb"] },
            { type: "text", content: ["c\nd"] },
          ],
        },
      ],
    });
  });

  it("keeps elements as containers when their content or styles disqualify text import", async () => {
    const html = `
      <a href="/x"><img src="https://site.com/x.png"></a>
      <h1><img src="https://site.com/x.png"></h1>
      <a href="/y" style="display: flex">text</a>
    `;
    const { wiTree: rootEl } = await parseHtml(html, site);

    assert(rootEl, "rootEl should not be null");

    expect(rootEl).toMatchObject({
      type: "fragment",
      children: [
        // The img child means the link cannot become a text element.
        {
          type: "container",
          tag: "a",
          attrs: { href: "/x" },
          children: [{ type: "container", tag: "img" }],
        },
        // A heading with only an image still imports; it must not be dropped.
        {
          type: "container",
          tag: "h1",
          children: [{ type: "container", tag: "img" }],
        },
        // display:flex makes it a layout box even though it only holds text.
        {
          type: "container",
          tag: "a",
          children: [{ type: "text", content: ["text"] }],
        },
      ],
    });
  });

  it("extracts inline styles properly", async () => {
    const html =
      '<div style="display: flex; margin: 10px; color: #0000ff"><h1>Blue Heading 1</h1></div>';
    const { wiTree: rootEl } = await parseHtml(html, site);

    assert(rootEl, "rootEl should not be null");

    expect(rootEl).toMatchObject<Partial<WIElement>>({
      type: "fragment",
      children: [
        {
          type: "container",
          path: expect.any(String),
          tag: "div",
          attrs: { style: "display: flex; margin: 10px; color: #0000ff" },
          children: [
            {
              type: "text",
              path: expect.any(String),
              tag: "h1",
              content: ["Blue Heading 1"],
              attrs: {},
              variantSettings: [],
            },
          ],
          variantSettings: [
            {
              unsanitizedStyles: {
                display: "flex",
                "flex-direction": "row",
                margin: "10px",
                color: "rgb(0, 0, 255)",
              },
              safeStyles: {
                display: "flex",
                flexDirection: "row",
                marginTop: "10px",
                marginBottom: "10px",
                marginLeft: "10px",
                marginRight: "10px",
                color: "rgb(0, 0, 255)",
              },
              unsafeStyles: {},
              variantCombo: [{ type: "base" }],
            },
          ],
        },
      ],
    });
  });

  it("extracts stylesheet styles properly", async () => {
    const html = `<style>
.container {
  display: flex;
  margin: 10px;
  color: #0000ff;
  padding: min(5%, 10px);
}

.heading {
  color: rgb(0,0,255);
  flex: 1 30px;
}
</style>
<div class="container"><h1 class="heading">Blue Heading 1</h1></div>`;
    const { wiTree: rootEl } = await parseHtml(html, site);

    assert(rootEl, "rootEl should not be null");

    expect(rootEl).toMatchObject<Partial<WIElement>>({
      type: "fragment",
      children: [
        {
          type: "container",
          path: expect.any(String),
          tag: "div",
          attrs: { class: "container" },
          children: [
            {
              type: "text",
              path: expect.any(String),
              tag: "h1",
              content: ["Blue Heading 1"],
              attrs: {},
              variantSettings: [
                {
                  unsanitizedStyles: {
                    color: "rgb(0,0,255)",
                    flex: "1 30px",
                  },
                  safeStyles: {
                    color: "rgb(0,0,255)",
                    flexGrow: "1",
                    flexBasis: "30px",
                  },
                  unsafeStyles: {},
                  variantCombo: [{ type: "base" }],
                },
              ],
            },
          ],
          variantSettings: [
            {
              unsanitizedStyles: {
                display: "flex",
                "flex-direction": "row",
                margin: "10px",
                padding: "min(5%,10px)",
              },
              safeStyles: {
                display: "flex",
                flexDirection: "row",
                marginTop: "10px",
                marginBottom: "10px",
                marginLeft: "10px",
                marginRight: "10px",
                paddingTop: "min(5%,10px)",
                paddingRight: "min(5%,10px)",
                paddingBottom: "min(5%,10px)",
                paddingLeft: "min(5%,10px)",
              },
              unsafeStyles: {},
              variantCombo: [{ type: "base" }],
            },
          ],
        },
      ],
    });
  });

  it("parses an svg element with proper attributes", async () => {
    const svgElement = `<svg width="32px" height="32" viewBox="0 0 24 24" fill="#f3f3f3">
                            <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path>
                        </svg>`;
    const html = `<div>${svgElement}</div>`;

    const { wiTree: rootEl } = await parseHtml(html, site);

    assert(rootEl, "rootEl should not be null");

    expect(rootEl).toMatchObject<Partial<WIElement>>({
      type: "fragment",
      children: [
        {
          type: "container",
          path: expect.any(String),
          tag: "div",
          children: [
            {
              type: "svg",
              path: expect.any(String),
              tag: "svg",
              outerHtml: svgElement,
              attrs: {},
              variantSettings: [],
              width: "32px",
              height: "32px",
            },
          ],
          variantSettings: [],
          attrs: {},
        },
      ],
    });
  });

  it("expands gap property for flex layouts", async () => {
    const html = '<div style="display: flex; gap: 10px">Content</div>';
    const { wiTree: rootEl } = await parseHtml(html, site);

    assert(rootEl, "rootEl should not be null");

    expect(rootEl).toMatchObject<Partial<WIElement>>({
      type: "fragment",
      children: [
        {
          type: "container",
          path: expect.any(String),
          tag: "div",
          attrs: { style: "display: flex; gap: 10px" },
          children: [
            {
              type: "text",
              path: expect.any(String),
              tag: "span",
              content: ["Content"],
              attrs: {},
              variantSettings: [],
            },
          ],
          variantSettings: [
            {
              unsanitizedStyles: {
                display: "flex",
                gap: "10px",
              },
              safeStyles: {
                display: "flex",
                flexDirection: "row",
                rowGap: "10px",
                columnGap: "10px",
              },
              unsafeStyles: {},
              variantCombo: [{ type: "base" }],
            },
          ],
        },
      ],
    });
  });

  it("expands gap property for grid layouts", async () => {
    const html = '<div style="display: grid; gap: 20px">Content</div>';
    const { wiTree: rootEl } = await parseHtml(html, site);

    assert(rootEl, "rootEl should not be null");

    expect(rootEl).toMatchObject<Partial<WIElement>>({
      type: "fragment",
      children: [
        {
          type: "container",
          path: expect.any(String),
          tag: "div",
          attrs: { style: "display: grid; gap: 20px" },
          children: [
            {
              type: "text",
              path: expect.any(String),
              tag: "span",
              content: ["Content"],
              attrs: {},
              variantSettings: [],
            },
          ],
          variantSettings: [
            {
              unsanitizedStyles: {
                display: "grid",
                gap: "20px",
              },
              safeStyles: {
                display: "grid",
                gridRowGap: "20px",
                gridColumnGap: "20px",
              },
              unsafeStyles: {},
              variantCombo: [{ type: "base" }],
            },
          ],
        },
      ],
    });
  });

  it("Parse max-width media query for desktop-first approach", async () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <style>
        /* Desktop styles (default) */
        .responsive-heading {
            color: blue;
            font-size: 48px;
            font-weight: bold;
        }

        /* Tablet styles (768px and below) */
        @media (max-width: 768px) {
            .responsive-heading {
                color: green;
                font-size: 36px;
            }
        }

        /* Mobile styles (400px and below) */
        @media (max-width: 400px) {
            .responsive-heading {
                color: red;
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div>
        <h1 class="responsive-heading">Responsive Heading</h1>
    </div>
</body>
</html>`;
    const { wiTree: rootEl } = await parseHtml(html, site);

    assert(rootEl, "rootEl should not be null");

    expect(rootEl).toMatchObject<WIElement>({
      type: "container",
      path: expect.any(String),
      tag: "div",
      variantSettings: [
        {
          unsanitizedStyles: { width: "100%" },
          safeStyles: { width: "100%" },
          unsafeStyles: {},
          variantCombo: [{ type: "base" }],
        },
      ],
      children: [
        {
          type: "container",
          path: expect.any(String),
          tag: "div",
          variantSettings: [],
          children: [
            {
              type: "text",
              path: expect.any(String),
              tag: "h1",
              content: ["Responsive Heading"],
              attrs: {},
              variantSettings: [
                {
                  unsanitizedStyles: {
                    color: "blue",
                    "font-size": "48px",
                    "font-weight": "bold",
                  },
                  safeStyles: {
                    color: "blue",
                    fontSize: "48px",
                    fontWeight: "bold",
                  },
                  unsafeStyles: {},
                  variantCombo: [{ type: "base" }],
                },
                {
                  unsanitizedStyles: { color: "green", "font-size": "36px" },
                  safeStyles: { color: "green", fontSize: "36px" },
                  unsafeStyles: {},
                  variantCombo: [
                    { type: VariantGroupType.GlobalScreen, width: 768 },
                  ],
                },
                {
                  unsanitizedStyles: { color: "red", "font-size": "24px" },
                  safeStyles: { color: "red", fontSize: "24px" },
                  unsafeStyles: {},
                  variantCombo: [
                    { type: VariantGroupType.GlobalScreen, width: 400 },
                  ],
                },
              ],
            },
          ],
          attrs: {},
        },
      ],
      attrs: { style: "width: 100%;" },
    });
  });

  it("Parse min-width media query for mobile-first approach", async () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <style>
        /* Mobile styles (default) */
        .responsive-heading {
            color: blue;
            font-size: 48px;
            font-weight: bold;
        }

        /* Tablet styles (768px and above) */
        @media (min-width: 768px) {
            .responsive-heading {
                color: green;
                font-size: 36px;
            }
        }

        /* Desktop styles (1200px and above) */
        @media (min-width: 1200px) {
            .responsive-heading {
                color: red;
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div>
        <h1 class="responsive-heading">Responsive Heading</h1>
    </div>
</body>
</html>`;
    const { wiTree: rootEl } = await parseHtml(html, site);

    assert(rootEl, "rootEl should not be null");

    expect(rootEl).toMatchObject<WIElement>({
      type: "container",
      path: expect.any(String),
      tag: "div",
      variantSettings: [
        {
          unsanitizedStyles: { width: "100%" },
          safeStyles: { width: "100%" },
          unsafeStyles: {},
          variantCombo: [{ type: "base" }],
        },
      ],
      children: [
        {
          type: "container",
          path: expect.any(String),
          tag: "div",
          variantSettings: [],
          children: [
            {
              type: "text",
              path: expect.any(String),
              tag: "h1",
              content: ["Responsive Heading"],
              attrs: {},
              variantSettings: [
                {
                  unsanitizedStyles: {
                    color: "blue",
                    "font-size": "48px",
                    "font-weight": "bold",
                  },
                  safeStyles: {
                    color: "blue",
                    fontSize: "48px",
                    fontWeight: "bold",
                  },
                  unsafeStyles: {},
                  variantCombo: [{ type: "base" }],
                },
                {
                  unsanitizedStyles: { color: "green", "font-size": "36px" },
                  safeStyles: { color: "green", fontSize: "36px" },
                  unsafeStyles: {},
                  variantCombo: [
                    { type: VariantGroupType.GlobalScreen, width: 768 },
                  ],
                },
                {
                  unsanitizedStyles: { color: "red", "font-size": "24px" },
                  safeStyles: { color: "red", fontSize: "24px" },
                  unsafeStyles: {},
                  variantCombo: [
                    { type: VariantGroupType.GlobalScreen, width: 1200 },
                  ],
                },
              ],
            },
          ],
          attrs: {},
        },
      ],
      attrs: { style: "width: 100%;" },
    });
  });

  it("Parse pseudo selectors (hover state) and ignores pseudo-elements", async () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <style>
        .interactive-button {
            background-color: blue;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
        }

        .interactive-button:hover {
            background-color: darkblue;
            color: lightgray;
        }

        /* These pseudo-elements should be ignored */
        .interactive-button::before {
            content: "→ ";
            color: yellow;
        }

        .interactive-button::after {
            content: " ←";
            color: green;
        }

        /* Pseudo-class + pseudo-element combinations should also be ignored */
        .interactive-button:hover::before {
            color: orange;
        }

        .interactive-button:hover::after {
            color: pink;
        }
    </style>
</head>
<body>
    <button class="interactive-button">Click me</button>
</body>
</html>`;
    const { wiTree: rootEl } = await parseHtml(html, site);

    assert(rootEl, "rootEl should not be null");

    expect(rootEl).toMatchObject<WIElement>({
      type: "container",
      path: expect.any(String),
      tag: "div",
      variantSettings: [
        {
          unsanitizedStyles: { width: "100%" },
          safeStyles: { width: "100%" },
          unsafeStyles: {},
          variantCombo: [{ type: "base" }],
        },
      ],
      children: [
        {
          type: "container",
          path: expect.any(String),
          tag: "button",
          attrs: { class: "interactive-button" },
          children: [
            {
              type: "text",
              path: expect.any(String),
              tag: "span",
              content: ["Click me"],
              attrs: {},
              variantSettings: [],
            },
          ],
          variantSettings: [
            {
              unsanitizedStyles: {
                "background-color": "blue",
                padding: "10px 20px",
                border: "none",
                "border-radius": "4px",
                color: "white",
              },
              safeStyles: {
                color: "white",
                background: "linear-gradient(blue, blue)",
                paddingTop: "10px",
                paddingRight: "20px",
                paddingBottom: "10px",
                paddingLeft: "20px",
                borderTopLeftRadius: "4px",
                borderTopRightRadius: "4px",
                borderBottomRightRadius: "4px",
                borderBottomLeftRadius: "4px",
                borderTopStyle: "none",
                borderBottomStyle: "none",
                borderRightStyle: "none",
                borderLeftStyle: "none",
              },
              unsafeStyles: {},
              variantCombo: [{ type: "base" }],
            },
            {
              unsanitizedStyles: {
                "background-color": "darkblue",
                color: "lightgray",
              },
              safeStyles: {
                background: "linear-gradient(darkblue, darkblue)",
                color: "lightgray",
              },
              unsafeStyles: {},
              variantCombo: [{ type: "style", selectors: ["hover"] }],
            },
          ],
        },
      ],
      attrs: { style: "width: 100%;" },
    });
  });

  it("Parse multiple pseudo selectors (hover and focus)", async () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <style>
        .form-input {
            border: 2px solid gray;
            padding: 8px;
            border-radius: 4px;
        }

        .form-input:hover {
            border-color: blue;
        }

        .form-input:focus {
            border-color: green;
            outline: none;
        }
    </style>
</head>
<body>
    <input type="text" class="form-input" placeholder="Enter text">
</body>
</html>`;
    const { wiTree: rootEl } = await parseHtml(html, site);

    assert(rootEl, "rootEl should not be null");

    expect(rootEl).toMatchObject<WIElement>({
      type: "container",
      path: expect.any(String),
      tag: "div",
      variantSettings: [
        {
          unsanitizedStyles: { width: "100%" },
          safeStyles: { width: "100%" },
          unsafeStyles: {},
          variantCombo: [{ type: "base" }],
        },
      ],
      children: [
        {
          type: "container",
          path: expect.any(String),
          tag: "input",
          attrs: {
            type: "text",
            class: "form-input",
            placeholder: "Enter text",
          },
          children: [],
          variantSettings: [
            {
              unsanitizedStyles: {
                border: "2px solid gray",
                padding: "8px",
                "border-radius": "4px",
              },
              safeStyles: {
                borderTopStyle: "solid",
                borderRightStyle: "solid",
                borderBottomStyle: "solid",
                borderLeftStyle: "solid",
                borderTopWidth: "2px",
                borderRightWidth: "2px",
                borderBottomWidth: "2px",
                borderLeftWidth: "2px",
                borderTopColor: "gray",
                borderRightColor: "gray",
                borderBottomColor: "gray",
                borderLeftColor: "gray",
                borderTopLeftRadius: "4px",
                borderTopRightRadius: "4px",
                borderBottomRightRadius: "4px",
                borderBottomLeftRadius: "4px",
                paddingTop: "8px",
                paddingRight: "8px",
                paddingBottom: "8px",
                paddingLeft: "8px",
              },
              unsafeStyles: {},
              variantCombo: [{ type: "base" }],
            },
            {
              unsanitizedStyles: {
                "border-color": "blue",
              },
              safeStyles: {
                borderTopColor: "blue",
                borderRightColor: "blue",
                borderBottomColor: "blue",
                borderLeftColor: "blue",
              },
              unsafeStyles: {},
              variantCombo: [{ type: "style", selectors: ["hover"] }],
            },
            {
              unsanitizedStyles: {
                "border-color": "green",
                outline: "none",
              },
              safeStyles: {
                borderTopColor: "green",
                borderRightColor: "green",
                borderBottomColor: "green",
                borderLeftColor: "green",
              },
              unsafeStyles: {},
              variantCombo: [{ type: "style", selectors: ["focus"] }],
            },
          ],
        },
      ],
      attrs: { style: "width: 100%;" },
    });
  });

  it("Parse screen variants with pseudo selectors (combination)", async () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <style>
        .responsive-button {
            background-color: blue;
            color: white;
            font-size: 16px;
            padding: 12px 24px;
        }

        .responsive-button:hover {
            background-color: darkblue;
        }

        @media (max-width: 768px) {
            .responsive-button {
                font-size: 14px;
                padding: 10px 20px;
            }

            .responsive-button:hover {
                background-color: purple;
            }
        }
    </style>
</head>
<body>
    <button class="responsive-button">Responsive Button</button>
</body>
</html>`;
    const { wiTree: rootEl } = await parseHtml(html, site);

    assert(rootEl, "rootEl should not be null");

    expect(rootEl).toMatchObject<WIElement>({
      type: "container",
      path: expect.any(String),
      tag: "div",
      variantSettings: [
        {
          unsanitizedStyles: { width: "100%" },
          safeStyles: { width: "100%" },
          unsafeStyles: {},
          variantCombo: [{ type: "base" }],
        },
      ],
      children: [
        {
          type: "container",
          path: expect.any(String),
          tag: "button",
          attrs: { class: "responsive-button" },
          children: [
            {
              type: "text",
              path: expect.any(String),
              tag: "span",
              content: ["Responsive Button"],
              attrs: {},
              variantSettings: [],
            },
          ],
          variantSettings: [
            {
              unsanitizedStyles: {
                "background-color": "blue",
                padding: "12px 24px",
                color: "white",
                "font-size": "16px",
              },
              safeStyles: {
                color: "white",
                fontSize: "16px",
                background: "linear-gradient(blue, blue)",
                paddingTop: "12px",
                paddingRight: "24px",
                paddingBottom: "12px",
                paddingLeft: "24px",
              },
              unsafeStyles: {},
              variantCombo: [{ type: "base" }],
            },
            {
              unsanitizedStyles: {
                "background-color": "darkblue",
              },
              safeStyles: {
                background: "linear-gradient(darkblue, darkblue)",
              },
              unsafeStyles: {},
              variantCombo: [{ type: "style", selectors: ["hover"] }],
            },
            {
              unsanitizedStyles: {
                "font-size": "14px",
                padding: "10px 20px",
              },
              safeStyles: {
                fontSize: "14px",
                paddingTop: "10px",
                paddingRight: "20px",
                paddingBottom: "10px",
                paddingLeft: "20px",
              },
              unsafeStyles: {},
              variantCombo: [
                { type: VariantGroupType.GlobalScreen, width: 768 },
              ],
            },
            {
              unsanitizedStyles: {
                "background-color": "purple",
              },
              safeStyles: {
                background: "linear-gradient(purple, purple)",
              },
              unsafeStyles: {},
              variantCombo: [
                { type: VariantGroupType.GlobalScreen, width: 768 },
                { type: "style", selectors: ["hover"] },
              ],
            },
          ],
        },
      ],
      attrs: { style: "width: 100%;" },
    });
  });
  it("Parses border mixed properties", async () => {
    const html = `<!DOCTYPE html>
      <html lang="en">
        <head>
          <style>
            .mixed-properties {
              border: 2px solid black;
              border-top: thick dashed purple;
              border-color: yellow;
            }
          </style>
        </head>
        <body>
        <div>
        <div class="mixed-properties">Mixed Properties</div>  
      </div>
        </body>
    </html>
`;

    const { wiTree: rootEl } = await parseHtml(html, site);
    assert(rootEl, "rootEl should not be null");

    expect(rootEl).toMatchObject<Partial<WIElement>>({
      type: "container",
      tag: "div",
      variantSettings: [
        {
          unsanitizedStyles: { width: "100%" },
          safeStyles: { width: "100%" },
          unsafeStyles: {},
          variantCombo: [{ type: "base" }],
        },
      ],
      children: [
        {
          type: "container",
          path: expect.any(String),
          tag: "div",
          variantSettings: [],
          children: [
            {
              type: "container",
              path: expect.any(String),
              tag: "div",
              variantSettings: [
                {
                  unsanitizedStyles: {
                    border: "2px solid black",
                    "border-top": "thick dashed purple",
                    "border-color": "yellow",
                  },
                  safeStyles: {
                    borderTopStyle: "dashed",
                    borderRightStyle: "solid",
                    borderBottomStyle: "solid",
                    borderLeftStyle: "solid",
                    borderTopWidth: "5px",
                    borderRightWidth: "2px",
                    borderBottomWidth: "2px",
                    borderLeftWidth: "2px",
                    borderTopColor: "yellow",
                    borderRightColor: "yellow",
                    borderBottomColor: "yellow",
                    borderLeftColor: "yellow",
                  },
                  unsafeStyles: {},
                  variantCombo: [{ type: "base" }],
                },
              ],
              children: [
                {
                  type: "text",
                  path: expect.any(String),
                  content: ["Mixed Properties"],
                  tag: "span",
                  attrs: {},
                  variantSettings: [],
                },
              ],
              attrs: { class: "mixed-properties" },
            },
          ],
          attrs: {},
        },
      ],
      attrs: { style: "width: 100%;" },
    });
  });
});

describe("renameTokenVarNameToUuid", () => {
  const site = createSite();
  const tplMgr = new TplMgr({ site });
  const colorPrimaryToken = tplMgr.addStyleToken({
    tokenType: "Color",
    name: "Brand/Brand",
    value: "#3594F0",
  });
  const colorPrimaryForegroundToken = tplMgr.addStyleToken({
    tokenType: "Color",
    name: "Neutral/Neutral",
    value: "#374151",
  });

  it("Rename token variable name to token uuid ", async () => {
    // "returns original value for invalid token"
    expect(
      renameTokenVarNameToUuid("var(--token-unknown-token)", site)
    ).toEqual("var(--token-unknown-token)");

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

    // "renames valid tokens and keeps invalid tokens in mixed case"
    expect(
      renameTokenVarNameToUuid(
        `linear-gradient(var(--token-unknown-token), var(--token-${toVarName(
          colorPrimaryForegroundToken.name
        )}))`,
        site
      )
    ).toEqual(
      `linear-gradient(var(--token-unknown-token), var(--token-${colorPrimaryForegroundToken.uuid}))`
    );

    // "returns original value for invalid token in border value"
    expect(
      renameTokenVarNameToUuid(`1px var(--token-border-color) solid`, site)
    ).toEqual("1px var(--token-border-color) solid");
  });
});

describe("fixCSSValue", () => {
  it("returns empty object for empty value", () => {
    expect(fixCSSValue("color", "")).toEqual({});
  });

  it("returns empty object for key 'content'", () => {
    expect(fixCSSValue("content", "some text")).toEqual({});
  });

  it("parses calc expressions as-is", () => {
    const res = fixCSSValue("width", "calc(10px + 2vh + 5vw)");
    expect(res).toEqual({ width: "calc(10px + 2vh + 5vw)" });
  });

  it("parses calc expressions with vw", () => {
    const res = fixCSSValue("height", "calc(10px + 3vw)");
    expect(res).toEqual({ height: "calc(10px + 3vw)" });
  });

  it("parses calc expressions and expands shorthand properties", () => {
    const res = fixCSSValue("margin", "calc(4px + 5rem)");
    expect(res).toEqual({
      marginTop: "calc(4px + 5rem)",
      marginRight: "calc(4px + 5rem)",
      marginBottom: "calc(4px + 5rem)",
      marginLeft: "calc(4px + 5rem)",
    });
  });

  it("parses calc expressions with complex nested operations", () => {
    const res = fixCSSValue("width", "calc((100% - 40px) / 2)");
    expect(res).toEqual({ width: "calc((100% - 40px) / 2)" });
  });

  it("parses min() function", () => {
    const res = fixCSSValue("width", "min(100%, 500px)");
    expect(res).toEqual({ width: "min(100%, 500px)" });
  });

  it("parses max() function", () => {
    const res = fixCSSValue("height", "max(200px, 50vh)");
    expect(res).toEqual({ height: "max(200px, 50vh)" });
  });

  it("parses clamp() function", () => {
    const res = fixCSSValue("font-size", "clamp(12px, 2vw, 24px)");
    expect(res).toEqual({ fontSize: "clamp(12px, 2vw, 24px)" });
  });

  it("parses nested calc in min function", () => {
    const res = fixCSSValue("width", "min(calc(100% - 20px), 800px)");
    expect(res).toEqual({ width: "min(calc(100% - 20px), 800px)" });
  });

  it("parses nested calc in clamp function", () => {
    const res = fixCSSValue("width", "clamp(200px, calc(50% - 20px), 600px)");
    expect(res).toEqual({ width: "clamp(200px, calc(50% - 20px), 600px)" });
  });

  it("parses calc expressions with variable", () => {
    const token = "var(--token-abc)";
    const res = fixCSSValue("width", `calc(10px + 2vh + ${token})`);
    expect(res).toEqual({ width: `calc(10px + 2vh + ${token})` });
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
      background: `linear-gradient(${token}, ${token})`,
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
    expect(
      fixCSSValue(
        "box-shadow",
        "calc(100% - 5px) 10px 15px calc(20% - 20px) rgba(0,0,0,0.5)"
      )
    ).toEqual({
      boxShadow: "calc(100% - 5px) 10px 15px calc(20% - 20px) rgba(0,0,0,0.5)",
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

  it("extracts first font from font-family values", () => {
    expect(fixCSSValue("font-family", '"Roboto"')).toEqual({
      fontFamily: "Roboto",
    });
    expect(fixCSSValue("font-family", "'Roboto'")).toEqual({
      fontFamily: "Roboto",
    });
    expect(fixCSSValue("font-family", "Roboto")).toEqual({
      fontFamily: "Roboto",
    });
    expect(fixCSSValue("font-family", '"Arial", sans-serif')).toEqual({
      fontFamily: "Arial",
    });
    expect(fixCSSValue("font-family", "'Times New Roman', serif")).toEqual({
      fontFamily: "Times New Roman",
    });
    expect(
      fixCSSValue("font-family", "Georgia, 'Times New Roman', serif")
    ).toEqual({
      fontFamily: "Georgia",
    });
  });
});

describe("processUnsanitizedStyles", () => {
  it("keeps background with an absolute url() in safe styles", () => {
    const url = "https://example.com/hero.png";
    expect(processUnsanitizedStyles({ background: `url(${url})` })).toEqual({
      safe: { background: `url("${url}")` },
      unsafe: {},
      errors: [],
    });
  });

  it("routes background with a relative or data: url() to unsafe styles", () => {
    const invalidUrls = [
      "/images/hero.png",
      "./hero.png",
      "../assets/hero.png",
      "data:image/png;base64,iVBORw0KGgo=",
    ];
    for (const url of invalidUrls) {
      expect(processUnsanitizedStyles({ background: `url(${url})` })).toEqual({
        safe: {},
        unsafe: { background: `url("${url}")` },
        errors: [],
      });
    }
  });

  it("validates url() targets regardless of the function name casing", () => {
    expect(
      processUnsanitizedStyles({ cursor: "URL(/bad.cur), pointer" })
    ).toEqual({
      safe: {},
      unsafe: { cursor: "URL(/bad.cur), pointer" },
      errors: [],
    });

    expect(
      processUnsanitizedStyles({
        cursor: "Url(https://example.com/ok.cur), pointer",
      })
    ).toEqual({
      safe: { cursor: "Url(https://example.com/ok.cur), pointer" },
      unsafe: {},
      errors: [],
    });
  });
});

describe("snapshot tests", () => {
  const site = createComponentTestSite();

  it("parse landing page html properly", async () => {
    const landingPageFilePath = path.join(
      __dirname,
      "testonly/data/landing-page.html"
    );
    const landingPageHtml = readFileSync(landingPageFilePath, "utf8");

    const output = await parseHtml(landingPageHtml, site);

    expect(output).toMatchSnapshot();
  });

  it("parses component page with props and slots correctly", async () => {
    const fixturePath = path.join(
      __dirname,
      "testonly/data/component-page.html"
    );
    const html = readFileSync(fixturePath, "utf8");

    const output = await parseHtml(html, site);

    expect(output).toMatchSnapshot();
  });
});

describe("keyframes and animations parsing", () => {
  const site = createSite();

  it("parses basic @keyframes rule with from/to", async () => {
    const html = `
      <div class="animated-div">Test</div>
      <style>
        @keyframes fadeIn {
          from { opacity: 0; background: #0000ff; }
          to { opacity: 1; background: #ff0000;}
        }
        .animated-div {
          -webkit-animation: fadeIn 2s ease-in-out;
          animation: fadeIn 2s ease-in-out;
        }
      </style>
    `;

    const { wiTree: rootEl, animationSequences } = await parseHtml(html, site);

    expect(animationSequences).toMatchObject([
      {
        name: "fadeIn",
        keyframes: [
          {
            percentage: 0,
            safeStyles: {
              opacity: "0",
              background: "linear-gradient(#0000ff, #0000ff)",
            },
            unsafeStyles: {},
          },
          {
            percentage: 100,
            safeStyles: {
              opacity: "1",
              background: "linear-gradient(#ff0000, #ff0000)",
            },
            unsafeStyles: {},
          },
        ],
      },
    ]);

    // Check that animation property is parsed on the element
    expect(rootEl).toMatchObject<Partial<WIElement>>({
      type: "fragment",
      children: [
        {
          type: "container",
          path: expect.any(String),
          tag: "div",
          children: [
            {
              type: "text",
              path: expect.any(String),
              tag: "span",
              content: ["Test"],
              attrs: {},
              variantSettings: [],
            },
          ],
          attrs: {},
          variantSettings: [
            {
              unsanitizedStyles: {
                "-webkit-animation": "fadeIn 2s ease-in-out",
                animation: "fadeIn 2s ease-in-out",
              },
              safeStyles: {
                animation: "fadeIn 2s ease-in-out",
              },
              unsafeStyles: {},
              variantCombo: [{ type: "base" }],
            },
          ],
        },
      ],
    });
  });

  it("parses @keyframes rules and ignores @-webkit-keyframes", async () => {
    const html = `
      <div>Test</div>
      <style>
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @-webkit-keyframes slideUp {
          0% { transform: translateY(20px); }
          100% { transform: translateY(0); }
        }
        
      </style>
    `;

    const { animationSequences } = await parseHtml(html, site);
    expect(animationSequences).toMatchObject([
      {
        name: "fadeIn",
        keyframes: [
          { percentage: 0, safeStyles: { opacity: "0" }, unsafeStyles: {} },
          { percentage: 100, safeStyles: { opacity: "1" }, unsafeStyles: {} },
        ],
      },
    ]);
    expect(animationSequences).toHaveLength(1);
  });

  it("sorts keyframes by percentage", async () => {
    const html = `
      <div>Test</div>
      <style>
        @keyframes unorderedAnimation {
          100% { opacity: 1; }
          25% { opacity: 0.25; }
          75% { opacity: 0.75; }
          0% { opacity: 0; }
          50% { opacity: 0.5; }
        }
      </style>
    `;

    const { animationSequences } = await parseHtml(html, site);

    expect(animationSequences).toMatchObject([
      {
        name: "unorderedAnimation",
        keyframes: [
          { percentage: 0, safeStyles: { opacity: "0" }, unsafeStyles: {} },
          { percentage: 25, safeStyles: { opacity: "0.25" }, unsafeStyles: {} },
          { percentage: 50, safeStyles: { opacity: "0.5" }, unsafeStyles: {} },
          { percentage: 75, safeStyles: { opacity: "0.75" }, unsafeStyles: {} },
          { percentage: 100, safeStyles: { opacity: "1" }, unsafeStyles: {} },
        ],
      },
    ]);
  });

  it("handles empty keyframes gracefully", async () => {
    const html = `
      <div>Test</div>
      <style>
        @keyframes emptyAnimation {
          /* no keyframes defined */
        }
      </style>
    `;

    const { animationSequences } = await parseHtml(html, site);
    expect(animationSequences[0]).toMatchObject({
      name: "emptyAnimation",
      keyframes: [],
    });
  });

  it("skips invalid keyframe selectors", async () => {
    const html = `
      <div>Test</div>
      <style>
        @keyframes mixedAnimation {
          0% { opacity: 0; }
          invalid { opacity: 0.5; }
          100% { opacity: 1; }
        }
      </style>
    `;

    const { animationSequences, errors } = await parseHtml(html, site);

    expect(animationSequences[0].keyframes).toEqual([
      { percentage: 0, safeStyles: { opacity: "0" }, unsafeStyles: {} },
      { percentage: 100, safeStyles: { opacity: "1" }, unsafeStyles: {} },
    ]);
    expect(errors).toContainEqual(
      expect.objectContaining({
        code: "invalid-keyframes",
        sequence: "mixedAnimation",
        selector: "invalid",
      })
    );
  });

  it("returns WIFragment when html has no explicit body tag, keeps root when it does", async () => {
    const fragment = "<p>Hello</p>";
    const { wiTree: fragmentTree } = await parseHtml(fragment, site);
    expect(fragmentTree).toMatchObject({
      type: "fragment",
      children: [
        {
          type: "text",
          tag: "p",
          content: ["Hello"],
        },
      ],
    });

    const fullPage = "<body><p>Hello</p></body>";
    const { wiTree: fullPageTree } = await parseHtml(fullPage, site);
    expect(fullPageTree.type).toEqual("container");
  });
});

describe("error reporting", () => {
  const site = createSite();

  it("returns Err with reason invalid-html when nothing is importable", async () => {
    const result = await parseHtmlToWebImporterTree(
      "<script>alert(1)</script>",
      site
    );
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().reason).toEqual("invalid-html");
  });

  it("skips a plasmic-component without a name and reports it, keeping siblings", async () => {
    const html = `<plasmic-component></plasmic-component><div style="color: red">Hi</div>`;
    const { wiTree, errors } = await parseHtml(html, site);

    // The invalid component is dropped; the sibling div still imports.
    expect(wiTree).toMatchObject({
      type: "fragment",
      children: [{ type: "container", tag: "div" }],
    });
    expect(errors).toContainEqual(
      expect.objectContaining({
        code: "invalid-component-instance",
        path: expect.stringContaining("plasmic-component"),
      })
    );
  });

  it("keeps a component with invalid data-props (as propless) and reports it", async () => {
    const html = `<plasmic-component data-plasmic-component="Button" data-props='[1,2]'></plasmic-component>`;
    const { wiTree, errors } = await parseHtml(html, site);

    expect(wiTree).toMatchObject({
      type: "fragment",
      children: [{ type: "component", component: "Button", props: {} }],
    });
    expect(errors).toContainEqual(
      expect.objectContaining({
        code: "invalid-data-props",
        component: "Button",
      })
    );
  });

  it("skips non-px media queries with a warning instead of failing the import", async () => {
    const html = `<style>
      .a { color: blue; }
      @media (min-width: 48em) { .a { color: red; } }
    </style><div class="a">Hi</div>`;
    const { wiTree, errors } = await parseHtml(html, site);

    expect(wiTree).toMatchObject({
      type: "fragment",
      children: [
        {
          type: "container",
          tag: "div",
          variantSettings: [
            expect.objectContaining({
              variantCombo: [{ type: "base" }],
            }),
          ],
        },
      ],
    });
    expect(errors).toContainEqual(
      expect.objectContaining({
        code: "unsupported-media-query",
        query: "(min-width:48em)",
      })
    );
  });

  it("falls back to viewBox size for unparseable svg dimensions with a warning", async () => {
    const html = `<div><svg width="foo" height="bar" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"></path></svg></div>`;
    const { wiTree, errors } = await parseHtml(html, site);

    expect(wiTree).toMatchObject({
      type: "fragment",
      children: [
        {
          type: "container",
          children: [{ type: "svg", width: "24px", height: "24px" }],
        },
      ],
    });
    expect(errors).toContainEqual(
      expect.objectContaining({ code: "svg-size-fallback" })
    );
  });

  it("reports unsupported pseudo-element selectors", async () => {
    const html = `<style>
      .a::before { content: "x"; }
      .a { color: red; }
    </style><div class="a">Hi</div>`;
    const { errors } = await parseHtml(html, site);
    expect(errors).toContainEqual(
      expect.objectContaining({
        code: "unsupported-selector",
        selector: ".a::before",
      })
    );
  });

  it("collects unresolved token references", () => {
    const errors: WIError[] = [];
    _testOnlyUtils.renameTokenVarNameToUuid(
      "var(--token-unknown-token)",
      site,
      errors
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        code: "unresolved-token",
        token: "unknown-token",
      })
    );
  });

  it("returns Err from fixCSSValue for unparseable values", () => {
    const result = _testOnlyUtils.fixCSSValue("background-color", "5px");
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toMatchObject({
      code: "invalid-style-declaration",
      prop: "background-color",
      value: "5px",
    });
  });

  it("drops only the invalid declaration, keeping valid siblings", async () => {
    // Via a stylesheet (not a style attr) since the browser's own
    // CSSStyleDeclaration already filters invalid inline declarations.
    const html = `<style>
      .a { color: red; background-color: 5px; }
    </style><div class="a">Hi</div>`;
    const { wiTree, errors } = await parseHtml(html, site);

    expect(wiTree).toMatchObject({
      type: "fragment",
      children: [
        {
          type: "container",
          variantSettings: [
            expect.objectContaining({
              safeStyles: expect.objectContaining({ color: "red" }),
            }),
          ],
        },
      ],
    });
    expect(errors).toContainEqual(
      expect.objectContaining({
        code: "invalid-style-declaration",
        prop: "background-color",
      })
    );
  });
});
