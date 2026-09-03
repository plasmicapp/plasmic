import {
  applyDevFlagOverrides,
  applyDevFlagOverridesToDefaults,
  applyDevFlagOverridesToTarget,
  DEVFLAGS,
  DevFlagsType,
} from "@/wab/shared/devflags";

describe("devflags", () => {
  describe("applyDevFlagOverridesToTarget", () => {
    it("merges objects properly", () => {
      const devflags = {
        defaultContentCreatorConfig: {
          styleSectionVisibilities: {
            visibility: false,
            typography: false,
          },
        },
      } as DevFlagsType;

      applyDevFlagOverridesToTarget(devflags, {
        defaultContentCreatorConfig: {
          styleSectionVisibilities: {
            visibility: true,
          },
        },
      });
      expect(
        devflags.defaultContentCreatorConfig.styleSectionVisibilities
          ?.visibility
      ).toBe(true);
      expect(
        devflags.defaultContentCreatorConfig.styleSectionVisibilities
          ?.typography
      ).toBe(false);

      applyDevFlagOverridesToTarget(devflags, {
        defaultContentCreatorConfig: {
          styleSectionVisibilities: {
            typography: true,
          },
        },
      });
      expect(
        devflags.defaultContentCreatorConfig.styleSectionVisibilities
          ?.visibility
      ).toBe(true);
      expect(
        devflags.defaultContentCreatorConfig.styleSectionVisibilities
          ?.typography
      ).toBe(true);
    });
  });

  describe("applyDevFlagOverridesToDefaults", () => {
    it("merges from default devflags", () => {
      const devflags1 = applyDevFlagOverridesToDefaults({
        defaultContentCreatorConfig: {
          styleSectionVisibilities: {
            visibility: true,
          },
        },
      });
      expect(
        devflags1.defaultContentCreatorConfig.styleSectionVisibilities
          ?.visibility
      ).toBe(true);
      expect(
        devflags1.defaultContentCreatorConfig.styleSectionVisibilities
          ?.typography
      ).toBe(false);

      const devflags2 = applyDevFlagOverridesToDefaults({
        defaultContentCreatorConfig: {
          styleSectionVisibilities: {
            typography: true,
          },
        },
      });
      expect(
        devflags2.defaultContentCreatorConfig.styleSectionVisibilities
          ?.visibility
      ).toBe(false);
      expect(
        devflags2.defaultContentCreatorConfig.styleSectionVisibilities
          ?.typography
      ).toBe(true);
    });
  });

  describe("applyDevFlagOverrides", () => {
    it("merges from default devflags", () => {
      expect(
        DEVFLAGS.defaultContentCreatorConfig.styleSectionVisibilities
          ?.visibility
      ).toBe(false);
      expect(
        DEVFLAGS.defaultContentCreatorConfig.styleSectionVisibilities
          ?.typography
      ).toBe(false);

      applyDevFlagOverrides({
        defaultContentCreatorConfig: {
          styleSectionVisibilities: {
            visibility: true,
          },
        },
      });
      expect(
        DEVFLAGS.defaultContentCreatorConfig.styleSectionVisibilities
          ?.visibility
      ).toBe(true);
      expect(
        DEVFLAGS.defaultContentCreatorConfig.styleSectionVisibilities
          ?.typography
      ).toBe(false);

      applyDevFlagOverrides({
        defaultContentCreatorConfig: {
          styleSectionVisibilities: {
            typography: true,
          },
        },
      });
      expect(
        DEVFLAGS.defaultContentCreatorConfig.styleSectionVisibilities
          ?.visibility
      ).toBe(false);
      expect(
        DEVFLAGS.defaultContentCreatorConfig.styleSectionVisibilities
          ?.typography
      ).toBe(true);
    });
  });
});
