import { mockMatchMedia } from "@/wab/__mocks__/matchMedia";
import { Bundle, Bundler } from "@/wab/shared/bundler";
import _bundle from "@/wab/shared/codegen/__tests__/bundles/global-variant-test.json"; // Exported from https://studio.plasmic.app/projects/8B4jaJR26Q16vAdbPyaxMr
import { codegen } from "@/wab/shared/codegen/codegen-tests-util";
import {
  CodegenScheme,
  ExportPlatform,
  StylesScheme,
} from "@/wab/shared/codegen/types";
import { Site } from "@/wab/shared/model/classes";
import { createUseStyleTokens } from "@plasmicapp/react-web";
import "@testing-library/jest-dom/extend-expect";
import { getByText, render, renderHook } from "@testing-library/react";
import { CssNode, find, parse } from "css-tree";
import * as React from "react";
import tmp from "tmp";

describe("tests codegen for global variants", () => {
  const bundle = _bundle[0][1] as Bundle;
  const site = new Bundler().unbundle(bundle, "") as Site;
  let platform: ExportPlatform;
  let codegenScheme: CodegenScheme;
  let stylesScheme: StylesScheme;
  let dir: tmp.DirResult;
  let importFromProject: (filePath: string) => Promise<any>;
  let readFromProject: (filePath: string) => string;
  let existsInProject: (filePath: string) => boolean;

  beforeEach(async () => {
    dir = tmp.dirSync({ unsafeCleanup: true });
    ({ importFromProject, readFromProject, existsInProject } = await codegen(
      dir.name,
      site,
      {
        platform,
        codegenScheme,
        stylesScheme,
      }
    ));

    mockMatchMedia(false);
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

  // Tokens are set in the base variant.
  const baseClass = "plasmic_tokens_1234567890";

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

  describe("platform: react, codegen: blackbox, styles: css", () => {
    beforeAll(() => {
      platform = "react";
      codegenScheme = "blackbox";
      stylesScheme = "css";
    });

    it("codegens plasmic.css with correct variantable tokens", async () => {
      const plasmicCss = parse(readFromProject("plasmic.css"), {
        parseRulePrelude: false,
        parseValue: false,
      });
      expect(
        findRuleDecl(plasmicCss, `.${baseClass}`, `--token-${bgTokenId}`)
      ).toEqual("#EEEEEE");
      expect(
        findRuleDecl(plasmicCss, `.${baseClass}`, `--token-${fgTokenId}`)
      ).toEqual("#000000");
      expect(
        findRuleDecl(
          plasmicCss,
          `.${baseClass}`,
          `--plasmic-token-${bgTokenName}`
        )
      ).toEqual(`var(--token-${bgTokenId})`);
      expect(
        findRuleDecl(
          plasmicCss,
          `.${baseClass}`,
          `--plasmic-token-${fgTokenName}`
        )
      ).toEqual(`var(--token-${fgTokenId})`);
      expect(
        findRuleDecl(
          plasmicCss,
          `.${baseClass}:where(.${darkClass})`,
          `--token-${bgTokenId}`
        )
      ).toEqual("#111111");
      expect(
        findRuleDecl(
          plasmicCss,
          `.${baseClass}:where(.${darkClass})`,
          `--token-${fgTokenId}`
        )
      ).toEqual("#FFFFFF");
      // TODO: remove redundant declarations (https://linear.app/plasmic/issue/PLA-12247)
      expect(
        findRuleDecl(
          plasmicCss,
          `.${baseClass}:where(.${darkClass})`,
          `--plasmic-token-${bgTokenName}`
        )
      ).toEqual(`var(--token-${bgTokenId})`);
      expect(
        findRuleDecl(
          plasmicCss,
          `.${baseClass}:where(.${darkClass})`,
          `--plasmic-token-${fgTokenName}`
        )
      ).toEqual(`var(--token-${fgTokenId})`);
    });

    it("codegens component CSS with correct variantable tokens", async () => {
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
    });

    it("codegens component, StyleTokensProvider, and useStyleTokens that react to global variants", async () => {
      const { StyleTokensProvider, _useStyleTokens } = await importFromProject(
        "PlasmicStyleTokensProvider.tsx"
      );
      const { default: Homepage } = await importFromProject("Homepage.js");

      // Render with no global variants
      {
        const expectedClasses = [baseClass];
        const unexpectedClasses = [darkClass];

        const component = render(<Homepage />);
        expectHomepage(expectedClasses, unexpectedClasses);
        component.unmount();

        const useStyleTokens = renderHook(_useStyleTokens);
        expect(useStyleTokens.result.current).toEqual(expectedClasses);
        useStyleTokens.unmount();

        const useStyleTokensFromProvider = renderHook(useStyleTokensTester, {
          wrapper: StyleTokensProvider,
        });
        expect(useStyleTokensFromProvider.result.current).toEqual(
          expectedClasses
        );
        useStyleTokensFromProvider.unmount();
      }

      // Render with global variant "Theme: undefined"
      const { ThemeContextProvider } = await importFromProject(
        "PlasmicGlobalVariant__Theme.js"
      );
      {
        const expectedClasses = [baseClass];
        const unexpectedClasses = [darkClass];

        const wrapper = ({ children }: React.PropsWithChildren) => {
          return (
            <ThemeContextProvider value={undefined}>
              {children}
            </ThemeContextProvider>
          );
        };

        const component = render(<Homepage />, { wrapper });
        expectHomepage(expectedClasses, unexpectedClasses);
        component.unmount();

        const useStyleTokens = renderHook(_useStyleTokens, { wrapper });
        expect(useStyleTokens.result.current).toEqual(expectedClasses);
        useStyleTokens.unmount();

        const useStyleTokensFromProvider = renderHook(useStyleTokensTester, {
          wrapper: ({ children }) =>
            wrapper({
              children: <StyleTokensProvider>{children}</StyleTokensProvider>,
            }),
        });
        expect(useStyleTokensFromProvider.result.current).toEqual(
          expectedClasses
        );
        useStyleTokensFromProvider.unmount();
      }

      // Render with global variant "Theme: Dark"
      {
        const expectedClasses = [baseClass, darkClass];
        const unexpectedClasses = [];

        const wrapper = ({ children }: React.PropsWithChildren) => {
          return (
            <ThemeContextProvider value={"dark"}>
              {children}
            </ThemeContextProvider>
          );
        };

        const component = render(<Homepage />, { wrapper });
        expectHomepage(expectedClasses, unexpectedClasses);
        component.unmount();

        const useStyleTokens = renderHook(_useStyleTokens, { wrapper });
        expect(useStyleTokens.result.current).toEqual(expectedClasses);
        useStyleTokens.unmount();

        const useStyleTokensFromProvider = renderHook(useStyleTokensTester, {
          wrapper: ({ children }) =>
            wrapper({
              children: <StyleTokensProvider>{children}</StyleTokensProvider>,
            }),
        });
        expect(useStyleTokensFromProvider.result.current).toEqual(
          expectedClasses
        );
        useStyleTokensFromProvider.unmount();
      }
    });

    it("properly uses global variants (mobile)", async () => {
      // Mock mobile media query
      mockMatchMedia(true);

      const { default: Homepage } = await importFromProject("Homepage.js");
      const { unmount } = render(<Homepage />);

      const rootEl = document.querySelector(rootSelector) as HTMLElement;
      expect(rootEl).toHaveClass(rootClass, baseClass);
      // We ensure that the text is the mobile version
      const h1El = getByText(rootEl, h1TextMobile);
      expect(h1El).toHaveClass(h1Class);
      const compEl = document.querySelector(compRootSelector) as HTMLElement;
      expect(compEl).toHaveClass(compRootClass, baseClass);
      unmount();
    });
  });

  describe("platform: react, codegen: plain, styles: css-modules", () => {
    beforeAll(() => {
      platform = "react";
      codegenScheme = "plain";
      stylesScheme = "css-modules";
    });

    it("codegens plasmic.css with correct variantable tokens", async () => {
      const plasmicCss = parse(readFromProject("plasmic.module.css"), {
        parseRulePrelude: false,
        parseValue: false,
      });
      expect(
        findRuleDecl(plasmicCss, `.plasmic_tokens`, `--token-${bgTokenId}`)
      ).toEqual("#EEEEEE");
      expect(
        findRuleDecl(plasmicCss, `.plasmic_tokens`, `--token-${fgTokenId}`)
      ).toEqual("#000000");
      expect(
        findRuleDecl(
          plasmicCss,
          `.plasmic_tokens`,
          `--plasmic-token-${bgTokenName}`
        )
      ).toEqual(`var(--token-${bgTokenId})`);
      expect(
        findRuleDecl(
          plasmicCss,
          `.plasmic_tokens`,
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
    });

    it("codegens component CSS with correct variantable tokens", async () => {
      const pageCss = parse(readFromProject("Homepage.module.css"), {
        parseRulePrelude: false,
        parseValue: false,
      });
      expect(findRuleDecl(pageCss, `.root`, "background")).toEqual(
        `var(--token-${bgTokenId})`
      );
      expect(findRuleDecl(pageCss, `.h1`, "color")).toEqual(
        `var(--token-${fgTokenId})`
      );
    });

    it("codegens component that reacts to global variants, NO StyleTokensProvider and useStyleTokens", async () => {
      expect(existsInProject("PlasmicStyleTokensProvider.tsx")).toBe(false);

      const { default: Homepage } = await importFromProject("Homepage.js");

      // Render with no global variants
      {
        const expectedClasses = ["plasmic_tokens"];
        const unexpectedClasses = [darkClass];

        const component = render(<Homepage />);
        expectHomepage(expectedClasses, unexpectedClasses);
        component.unmount();
      }

      // Render with global variant "Theme: undefined"
      const { ThemeContextProvider } = await importFromProject(
        "PlasmicGlobalVariant__Theme.js"
      );
      {
        const expectedClasses = ["plasmic_tokens"];
        const unexpectedClasses = [darkClass];

        const wrapper = ({ children }: React.PropsWithChildren) => {
          return (
            <ThemeContextProvider value={undefined}>
              {children}
            </ThemeContextProvider>
          );
        };

        const component = render(<Homepage />, { wrapper });
        expectHomepage(expectedClasses, unexpectedClasses);
        component.unmount();
      }

      // Render with global variant "Theme: Dark"
      {
        const expectedClasses = ["plasmic_tokens", darkClass];
        const unexpectedClasses = [];

        const wrapper = ({ children }: React.PropsWithChildren) => {
          return (
            <ThemeContextProvider value={"dark"}>
              {children}
            </ThemeContextProvider>
          );
        };

        const component = render(<Homepage />, { wrapper });
        expectHomepage(expectedClasses, unexpectedClasses);
        component.unmount();
      }
    });

    it("properly uses global variants (mobile)", async () => {
      // Mock mobile media query
      mockMatchMedia(true);

      const { default: Homepage } = await importFromProject("Homepage.js");
      const { unmount } = render(<Homepage />);

      const rootEl = document.querySelector(rootSelector) as HTMLElement;
      expect(rootEl).toHaveClass("root", "plasmic_tokens");
      // We ensure that the text is the mobile version
      const h1El = getByText(rootEl, h1TextMobile);
      expect(h1El).toHaveClass("h1");
      const compEl = document.querySelector(compRootSelector) as HTMLElement;
      expect(compEl).toHaveClass("root", "plasmic_tokens");
      unmount();
    });
  });

  function expectHomepage(
    expectedClasses: string[],
    unexpectedClasses: string[]
  ) {
    // Root elements should get token classes
    const rootEl = document.querySelector(rootSelector) as HTMLElement;
    expect(rootEl).toHaveClass(...expectedClasses);

    // Component elements should get token classes
    const compEl = document.querySelector(compRootSelector) as HTMLElement;
    expect(compEl).toHaveClass(...expectedClasses);

    if (unexpectedClasses.length > 0) {
      expect(rootEl).not.toHaveClass(...unexpectedClasses);
      expect(compEl).not.toHaveClass(...unexpectedClasses);
    }

    // Tag elements should NOT get token classes
    const h1El = getByText(rootEl, h1TextDesktop);
    expect(h1El).not.toHaveClass("plasmic_tokens", baseClass, darkClass);
  }
});

/**
 * useStyleTokens that returns "no StyleTokensProvider" by default unless
 * nested in a StyleTokensProvider.
 *
 * This is used to simulate what happens when another project's useStyleTokens
 * is nested under this project's StyleTokensProvider.
 */
const useStyleTokensTester = createUseStyleTokens(
  {
    base: "no StyleTokensProvider",
    varianted: [],
  },
  () => ({})
);

describe("useProviderTest", () => {
  it("returns 'no StyleTokensProvider' by default", () => {
    const { unmount, result } = renderHook(useStyleTokensTester);
    expect(result.current).toEqual(["no StyleTokensProvider"]);
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
