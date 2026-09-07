import { generateSiteFromBundle } from "@/wab/shared/__testonly__/site-tests-utils";
import { Bundle } from "@/wab/shared/bundler";
import { ensure } from "@/wab/shared/common";
import {
  ensureThemeStyleMixin,
  isThemeStylePropAllowed,
  parseThemeSelector,
} from "@/wab/shared/core/theme-styles";
import { Site } from "@/wab/shared/model/classes";

import _bundle from "@/wab/shared/web-exporter/bundles/starter-project-desktop-first.json";

describe("parseThemeSelector", () => {
  it("parses base typography, tags, and tag pseudo-classes", () => {
    expect(parseThemeSelector("")).toEqual({
      tag: "",
      pseudoClass: "",
      selector: "",
    });
    expect(parseThemeSelector(" h1 ")).toEqual({
      tag: "h1",
      pseudoClass: "",
      selector: "h1",
    });
    expect(parseThemeSelector("a:hover")).toEqual({
      tag: "a",
      pseudoClass: ":hover",
      selector: "a:hover",
    });
    expect(parseThemeSelector("a:visited")).toEqual({
      tag: "a",
      pseudoClass: ":visited",
      selector: "a:visited",
    });
  });

  it("rejects non-themable tags, bare pseudo-classes, and inapplicable pseudo-classes", () => {
    expect(parseThemeSelector("div")).toMatchObject({
      error: expect.stringContaining("not themable"),
    });
    expect(parseThemeSelector(":hover")).toMatchObject({
      error: expect.stringContaining("require a tag"),
    });
    expect(parseThemeSelector("h1:visited")).toMatchObject({
      error: expect.stringContaining("not supported"),
    });
    expect(parseThemeSelector("h1:notreal")).toMatchObject({
      error: expect.stringContaining("not supported"),
    });
  });
});

describe("isThemeStylePropAllowed", () => {
  it("restricts base typography to typography props", () => {
    expect(isThemeStylePropAllowed("", "font-family")).toBe(true);
    expect(isThemeStylePropAllowed("", "white-space")).toBe(true);
    expect(isThemeStylePropAllowed("", "text-decoration-line")).toBe(true);
    expect(isThemeStylePropAllowed("", "text-overflow")).toBe(true);
    expect(isThemeStylePropAllowed("", "background")).toBe(false);
  });

  it("allows everything except position props on tags", () => {
    expect(isThemeStylePropAllowed("h1", "font-size")).toBe(true);
    expect(isThemeStylePropAllowed("h1", "background")).toBe(true);
    expect(isThemeStylePropAllowed("a", "text-decoration-line")).toBe(true);
    expect(isThemeStylePropAllowed("h1", "position")).toBe(false);
    expect(isThemeStylePropAllowed("h1", "top")).toBe(false);
    expect(isThemeStylePropAllowed("h1", "z-index")).toBe(false);
    expect(isThemeStylePropAllowed("h1", "order")).toBe(false);
    expect(isThemeStylePropAllowed("h1", "grid-row-start")).toBe(false);
    expect(isThemeStylePropAllowed("h1", "grid-column-end")).toBe(false);
  });
});

describe("theme-styles with a site", () => {
  let site: Site;

  beforeEach(() => {
    site = generateSiteFromBundle(_bundle as [string, Bundle][]);
  });

  describe("ensureThemeStyleMixin", () => {
    it("returns the existing mixin for a known selector without creating a new entry", () => {
      const theme = ensure(site.activeTheme, "Expected an active theme");
      const before = theme.styles.length;
      const existing = ensure(
        theme.styles.find((ts) => ts.selector === "h1"),
        "Expected an h1 theme style"
      );
      expect(ensureThemeStyleMixin(theme, "h1")).toBe(existing.style);
      expect(theme.styles.length).toBe(before);
    });

    it("creates a forTheme mixin entry for a new selector, idempotently", () => {
      const theme = ensure(site.activeTheme, "Expected an active theme");
      const before = theme.styles.length;
      const mixin = ensureThemeStyleMixin(theme, "strong");
      expect(mixin.forTheme).toBe(true);
      expect(theme.styles.length).toBe(before + 1);
      expect(ensureThemeStyleMixin(theme, "strong")).toBe(mixin);
      expect(theme.styles.length).toBe(before + 1);
    });
  });
});
