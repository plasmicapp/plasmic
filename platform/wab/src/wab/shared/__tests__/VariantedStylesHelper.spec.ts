import { TplMgr } from "@/wab/shared/TplMgr";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { createSite } from "@/wab/shared/core/sites";
import { MutableToken } from "@/wab/shared/core/tokens";
import { ProjectDependency } from "@/wab/shared/model/classes";

describe("VariantedStylesHelper", () => {
  describe("getActiveTokenValue", () => {
    it("should return the base value when there are no active global variants", () => {
      const site = createSite();
      const vsh = new VariantedStylesHelper(site);
      const tplMgr = new TplMgr({ site });
      const themeGlobalVariantGroup = tplMgr.createGlobalVariantGroup("Theme");
      const darkThemeVariant = tplMgr.createGlobalVariant(
        themeGlobalVariantGroup,
        "Dark"
      );

      const token = new MutableToken(
        tplMgr.addToken({
          name: "primary",
          tokenType: "Color",
          value: "#FF0000",
        })
      );
      token.setVariantedValue([darkThemeVariant], "#000000");

      const result = vsh.getActiveTokenValue(token);
      expect(result).toBe("#FF0000");
    });

    it("should return the varianted value when active variants match exactly", () => {
      const site = createSite();
      const tplMgr = new TplMgr({ site });
      const themeGlobalVariantGroup = tplMgr.createGlobalVariantGroup("Theme");
      const darkThemeVariant = tplMgr.createGlobalVariant(
        themeGlobalVariantGroup,
        "Dark"
      );
      const lightThemeVariant = tplMgr.createGlobalVariant(
        themeGlobalVariantGroup,
        "Light"
      );

      const vsh = new VariantedStylesHelper(site, [darkThemeVariant]);

      const token = new MutableToken(
        tplMgr.addToken({
          name: "primary",
          tokenType: "Color",
          value: "#FF0000",
        })
      );
      token.setVariantedValue([lightThemeVariant], "#FFFFFF");
      token.setVariantedValue([darkThemeVariant], "#000000");

      const result = vsh.getActiveTokenValue(token);
      expect(result).toBe("#000000");
    });

    it("should fallback to a similar token when no exact match exists", () => {
      const site = createSite();
      const tplMgr = new TplMgr({ site });

      // Create a local variant group
      const localThemeGroup = tplMgr.createGlobalVariantGroup("Theme");
      const localDarkVariant = tplMgr.createGlobalVariant(
        localThemeGroup,
        "Dark"
      );

      // Create a dependency site with a global variant group
      const depSite = createSite();
      const depTplMgr = new TplMgr({ site: depSite });
      const depThemeGroup = depTplMgr.createGlobalVariantGroup("Theme");
      const depDarkVariant = depTplMgr.createGlobalVariant(
        depThemeGroup,
        "Dark"
      );

      // Add the dependency to the main site
      const projectDependency = new ProjectDependency({
        name: "Theme Package",
        projectId: "theme-project-id",
        pkgId: "theme-pkg-id",
        version: "0.0.1",
        uuid: "theme-uuid",
        site: depSite,
      });
      site.projectDependencies.push(projectDependency);

      // Active variant is localDarkVariant, but token has varianted value for depDarkVariant
      const vsh = new VariantedStylesHelper(site, [localDarkVariant]);

      const token = new MutableToken(
        tplMgr.addToken({
          name: "primary",
          tokenType: "Color",
          value: "#FF0000", // base value
        })
      );
      // Token has varianted value for depDarkVariant (different UUID but same name and group name)
      token.setVariantedValue([depDarkVariant], "#000000");

      const result = vsh.getActiveTokenValue(token);
      // Should fallback to the similar token value instead of base value
      expect(result).toBe("#000000");
    });

    it("should return base value when no similar token exists for fallback", () => {
      const site = createSite();
      const tplMgr = new TplMgr({ site });

      const themeGroup1 = tplMgr.createGlobalVariantGroup("Theme");
      const themeGroup2 = tplMgr.createGlobalVariantGroup("Theme");
      const darkVariant1 = tplMgr.createGlobalVariant(themeGroup1, "Dark");
      const lightVariant2 = tplMgr.createGlobalVariant(themeGroup2, "Light"); // Different name

      const vsh = new VariantedStylesHelper(site, [darkVariant1]);

      const token = new MutableToken(
        tplMgr.addToken({
          name: "primary",
          tokenType: "Color",
          value: "#FF0000",
        })
      );
      // Token has varianted value for light variant (different name, so no fallback)
      token.setVariantedValue([lightVariant2], "#FFFFFF");

      const result = vsh.getActiveTokenValue(token);
      // Should return base value since no similar token exists
      expect(result).toBe("#FF0000");
    });
  });
});
