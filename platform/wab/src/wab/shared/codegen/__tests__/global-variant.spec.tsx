import "@testing-library/jest-dom/extend-expect";
import { getByText, render } from "@testing-library/react";
// polyfill some js features like String.matchAll()
import { Bundle, Bundler } from "@/wab/shared/bundler";
import { codegen } from "@/wab/shared/codegen/codegen-tests-util";
import { Site } from "@/wab/shared/model/classes";
import "core-js";
import { CssNode, find, parse } from "css-tree";
import * as React from "react";
import tmp from "tmp";
// Exported from https://studio.plasmic.app/projects/8B4jaJR26Q16vAdbPyaxMr
import { mockMatchMedia } from "@/wab/__mocks__/matchMedia";
import _bundle from "@/wab/shared/codegen/__tests__/bundles/global-variant-test.json";

describe("tests codegen for global variants", () => {
  const bundle = _bundle[0][1] as Bundle;
  const site = new Bundler().unbundle(bundle, "") as Site;
  let dir: tmp.DirResult;
  let importFromProject: (filePath: string) => Promise<any>;
  let readFromProject: (filePath: string) => string;

  beforeEach(async () => {
    dir = tmp.dirSync({ unsafeCleanup: true });
    ({ importFromProject, readFromProject } = await codegen(dir.name, site));
  });

  afterEach(() => {
    dir.removeCallback();
  });

  // jest + @testing-library/react doesn't support CSS
  // switching to vitest might solve this problem
  // therefore, we will manually verify the CSS files instead

  // This project has 2 tokens: background and foreground.
  const bgTokenId = "6vrCUn_jkTBV";
  const bgTokenName = "background";
  const fgTokenId = "bdgzzwrsGChb";
  const fgTokenName = "foreground";

  // There's also a global variant group named "Theme" with a variant "Dark".
  // Both background and foreground are changed in the "Dark" variant.
  const darkClass = "global_theme_dark";

  // There's 1 page with a root element, a h1 element, and a component (Comp) instance.
  // The root element uses the background token for the background,
  // and the h1 element uses the foreground token for the text color.
  // and the Comp component does not use any tokens.
  const rootSelector = "#background";
  const rootClass = "Homepage__root__unGtd";
  const h1TextDesktop = "h1 text";
  const h1TextMobile = "h1 text (mobile)";
  const h1Class = "Homepage__h1__pobpL";
  const compRootSelector = "#comp-root";
  const compRootClass = "Comp__root__v6FN";

  it("codegens correct global variantable tokens and context provider", async () => {
    // Mock Desktop media query
    mockMatchMedia(false);

    const plasmicCss = parse(readFromProject("plasmic.css"), {
      parseRulePrelude: false,
      parseValue: false,
    });
    expect(
      findRuleDecl(plasmicCss, ".plasmic_tokens", `--token-${bgTokenId}`)
    ).toEqual("#EEEEEE");
    expect(
      findRuleDecl(plasmicCss, ".plasmic_tokens", `--token-${fgTokenId}`)
    ).toEqual("#000000");
    expect(
      findRuleDecl(
        plasmicCss,
        ".plasmic_tokens",
        `--plasmic-token-${bgTokenName}`
      )
    ).toEqual(`var(--token-${bgTokenId})`);
    expect(
      findRuleDecl(
        plasmicCss,
        ".plasmic_tokens",
        `--plasmic-token-${fgTokenName}`
      )
    ).toEqual(`var(--token-${fgTokenId})`);
    expect(
      findRuleDecl(
        plasmicCss,
        `.plasmic_tokens:where(.${darkClass})`,
        `--token-${bgTokenId}`
      )
    ).toEqual("#111111");
    expect(
      findRuleDecl(
        plasmicCss,
        `.plasmic_tokens:where(.${darkClass})`,
        `--token-${fgTokenId}`
      )
    ).toEqual("#FFFFFF");
    // TODO: remove redundant declarations (https://linear.app/plasmic/issue/PLA-12247)
    expect(
      findRuleDecl(
        plasmicCss,
        `.plasmic_tokens:where(.${darkClass})`,
        `--plasmic-token-${bgTokenName}`
      )
    ).toEqual(`var(--token-${bgTokenId})`);
    expect(
      findRuleDecl(
        plasmicCss,
        `.plasmic_tokens:where(.${darkClass})`,
        `--plasmic-token-${fgTokenName}`
      )
    ).toEqual(`var(--token-${fgTokenId})`);

    const pageCss = parse(readFromProject("PlasmicHomepage.css"), {
      parseRulePrelude: false,
      parseValue: false,
    });
    expect(findRuleDecl(pageCss, `.${rootClass}`, "background")).toEqual(
      `var(--token-${bgTokenId})`
    );
    expect(findRuleDecl(pageCss, `.${h1Class}`, "color")).toEqual(
      `var(--token-${fgTokenId})`
    );

    // Now we that we have verified the CSS, let's see that it's used properly.
    const Homepage = (await importFromProject("Homepage.js")).default;
    const ThemeContextProvider = (
      await importFromProject("PlasmicGlobalVariant__Theme.js")
    ).ThemeContextProvider;

    // Render with no global variants
    {
      const { unmount } = render(<Homepage />);
      const rootEl = document.querySelector(rootSelector) as HTMLElement;
      expect(rootEl).toHaveClass(rootClass, "plasmic_tokens");
      expect(rootEl).not.toHaveClass(darkClass);
      const h1El = getByText(rootEl, h1TextDesktop);
      expect(h1El).toHaveClass(h1Class);
      expect(h1El).not.toHaveClass(darkClass);
      const compEl = document.querySelector(compRootSelector) as HTMLElement;
      // Each component instance gets the plasmic_tokens class
      expect(compEl).toHaveClass(compRootClass, "plasmic_tokens");
      expect(compEl).not.toHaveClass(darkClass);
      unmount();
    }

    // Render with global variant "Theme: undefined"
    {
      const { unmount } = render(
        <ThemeContextProvider value={undefined}>
          <Homepage />
        </ThemeContextProvider>
      );
      const rootEl = document.querySelector(rootSelector) as HTMLElement;
      expect(rootEl).toHaveClass(rootClass, "plasmic_tokens");
      expect(rootEl).not.toHaveClass(darkClass);
      const h1El = getByText(rootEl, h1TextDesktop);
      expect(h1El).toHaveClass(h1Class);
      expect(h1El).not.toHaveClass(darkClass);
      const compEl = document.querySelector(compRootSelector) as HTMLElement;
      expect(compEl).toHaveClass(compRootClass, "plasmic_tokens");
      expect(compEl).not.toHaveClass(darkClass);
      unmount();
    }

    // Render with global variant "Theme: Dark"
    {
      const { unmount } = render(
        <ThemeContextProvider value="dark">
          <Homepage />
        </ThemeContextProvider>
      );
      const rootEl = document.querySelector(rootSelector) as HTMLElement;
      expect(rootEl).toHaveClass(rootClass, "plasmic_tokens", darkClass);
      const h1El = getByText(rootEl, h1TextDesktop);
      expect(h1El).toHaveClass(h1Class);
      expect(h1El).not.toHaveClass(darkClass);
      const compEl = document.querySelector(compRootSelector) as HTMLElement;
      // We ensure that each component instance also gets the dark class alongside plasmic_tokens
      expect(compEl).toHaveClass(compRootClass, "plasmic_tokens", darkClass);
      unmount();
    }
  });

  it("properly uses global variants (mobile)", async () => {
    // Mock mobile media query
    mockMatchMedia(true);

    const Homepage = (await importFromProject("Homepage.js")).default;
    const { unmount } = render(<Homepage />);

    const rootEl = document.querySelector(rootSelector) as HTMLElement;
    expect(rootEl).toHaveClass(rootClass, "plasmic_tokens");
    // We ensure that the text is the mobile version
    const h1El = getByText(rootEl, h1TextMobile);
    expect(h1El).toHaveClass(h1Class);
    const compEl = document.querySelector(compRootSelector) as HTMLElement;
    expect(compEl).toHaveClass(compRootClass, "plasmic_tokens");
    unmount();
  });
});

function findRuleDecl(
  ast: CssNode,
  prelude: string,
  property: string
): string | null {
  const rule = find(ast, (node) => {
    return (
      node.type === "Rule" &&
      node.prelude.type === "Raw" &&
      node.prelude.value === prelude
    );
  });
  if (!rule) {
    return null;
  }

  const decl = findMap(
    rule,
    (node) =>
      node.type === "Declaration" &&
      node.property === property &&
      node.value.type === "Raw" &&
      node.value
  );
  if (!decl) {
    return null;
  }

  return decl.value.trim();
}

function findMap<T>(
  ast: CssNode,
  mapFn: (node: CssNode) => T | false
): T | null {
  const foundNode = find(ast, (node) => !!mapFn(node));
  return foundNode ? mapFn(foundNode) || null : null;
}
