import { Variant } from "@/wab/classes";
import { ensure } from "@/wab/common";
import {
  getFrameSizeForTargetScreenVariant,
  normalDesktopWidth,
  normalMobileWidth,
} from "@/wab/shared/Arenas";
import { mkVariant } from "@/wab/shared/Variants";
import { createSite } from "@/wab/sites";

describe("getFrameSizeForTargetScreenVariant", () => {
  it("works", () => {
    function prepSite(variants: Variant[]) {
      const site = createSite();
      const screenVariantGroup = ensure(site.activeScreenVariantGroup, "");
      screenVariantGroup.variants.push(...variants);
      return site;
    }

    {
      const wideDesktop = mkVariant({
        name: "Wide Desktop",
        mediaQuery: "(max-width: 1920px)",
      });
      const tablet = mkVariant({
        name: "Tablet",
        mediaQuery: "(max-width: 960px)",
      });
      const mobile = mkVariant({
        name: "Mobile",
        mediaQuery: "(max-width: 768px)",
      });
      const tiny = mkVariant({
        name: "Tiny",
        mediaQuery: "(max-width: 1px)",
      });
      // Handle base
      expect(
        getFrameSizeForTargetScreenVariant(prepSite([mobile]), undefined)
      ).toBe(normalDesktopWidth);
      // Handle wider base
      expect(
        getFrameSizeForTargetScreenVariant(
          prepSite([wideDesktop, mobile]),
          undefined
        )
      ).toBe(1921);
      // Handle empty
      expect(getFrameSizeForTargetScreenVariant(prepSite([]), undefined)).toBe(
        normalDesktopWidth
      );
      // Handle midpoint
      expect(
        getFrameSizeForTargetScreenVariant(prepSite([tablet, mobile]), tablet)
      ).toBe(Math.ceil((960 + 769) / 2));
      // Handle smallest - pick a reasonable mobile device size
      expect(
        getFrameSizeForTargetScreenVariant(prepSite([mobile]), mobile)
      ).toBe(normalMobileWidth);
      // Handle narrower smallest
      expect(getFrameSizeForTargetScreenVariant(prepSite([tiny]), tiny)).toBe(
        1
      );
    }

    {
      const wideDesktop = mkVariant({
        name: "Wide Desktop",
        mediaQuery: "(min-width: 1440px)",
      });
      const desktop = mkVariant({
        name: "Desktop",
        mediaQuery: "(min-width: 960px)",
      });
      const tablet = mkVariant({
        name: "Mobile",
        mediaQuery: "(min-width: 768px)",
      });
      const tiny = mkVariant({
        name: "Tiny",
        mediaQuery: "(min-width: 1px)",
      });
      // Handle base
      expect(
        getFrameSizeForTargetScreenVariant(prepSite([desktop]), undefined)
      ).toBe(normalMobileWidth);
      // Handle narrower base
      expect(
        getFrameSizeForTargetScreenVariant(prepSite([desktop, tiny]), undefined)
      ).toBe(0);
      // Handle midpoint
      expect(
        getFrameSizeForTargetScreenVariant(prepSite([desktop, tablet]), tablet)
      ).toBe(Math.floor((768 + 960 - 1) / 2));
      // Handle widest - pick a reasonable desktop device size
      expect(
        getFrameSizeForTargetScreenVariant(prepSite([desktop]), desktop)
      ).toBe(normalDesktopWidth);
      // Handle wider widest
      expect(
        getFrameSizeForTargetScreenVariant(prepSite([wideDesktop]), wideDesktop)
      ).toBe(1440);
    }
  });
});
