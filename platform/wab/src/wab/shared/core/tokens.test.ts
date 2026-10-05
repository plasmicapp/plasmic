import { mkDataToken } from "@/wab/commons/DataToken";
import { mkStyleToken } from "@/wab/commons/StyleToken";
import { mkVariant } from "@/wab/shared/Variants";
import { ChangeRecorder } from "@/wab/shared/core/observable-model";
import { createSite } from "@/wab/shared/core/sites";
import {
  ImmutableToken,
  MutableToken,
  OverrideableToken,
  setMembership,
  toFinalToken,
} from "@/wab/shared/core/tokens";
import { instUtil } from "@/wab/shared/model/InstUtil";
import {
  ProjectDependency,
  Site,
  StyleToken,
  VariantedValue,
} from "@/wab/shared/model/classes";
import { meta } from "@/wab/shared/model/classes-metas";

describe("tokens", () => {
  it("Mutable tokens - setValue, setVariantedValue", () => {
    const variantDark = mkVariant({ name: "dark" });
    const variantLight = mkVariant({ name: "light" });
    const token = new MutableToken(
      mkStyleToken({
        name: "primary",
        type: "Color",
        value: "#FF0000",
      }),
    );

    expect(token.value).toBe("#FF0000");
    expect(token.variantedValues).toHaveLength(0);

    // create a varianted value that is same as the base value
    token.setVariantedValue([variantLight], "#FF0000");
    // the varianted value is not created, because it was the same as the base value
    expect(token.variantedValues).toHaveLength(0);

    // create a varianted value that is different from the base value
    token.setVariantedValue([variantLight], "#00FF00");
    expect(token.variantedValues).toHaveLength(1);

    // create another varianted value
    token.setVariantedValue([variantDark], "#0000FF");
    expect(token.variantedValues).toHaveLength(2);
    expect(token.variantedValues[0].value).toBe("#00FF00");
    expect(token.variantedValues[1].value).toBe("#0000FF");

    // update the dark varianted value to be the same as the base value
    token.setVariantedValue([variantDark], "#FF0000");
    // expect the dark varianted value to be removed
    expect(token.variantedValues).toHaveLength(1);
    expect(token.variantedValues[0].value).toBe("#00FF00");

    // setValue to the same as a varianted value - the varianted value should be removed
    token.setValue("#00FF00");
    expect(token.variantedValues).toHaveLength(0);
    expect(token.value).toBe("#00FF00");

    // create the varianted values again to test removeVariantedValue
    token.setVariantedValue([variantLight], "#FFFF00");
    expect(token.variantedValues).toHaveLength(1);

    token.removeVariantedValue([variantLight]);
    expect(token.variantedValues).toHaveLength(0);
  });
  describe("Overridable tokens", () => {
    let styleToken: StyleToken;
    let overridableToken: OverrideableToken<StyleToken>;
    let site: Site;
    const variantDark = mkVariant({ name: "dark" });
    const variantLight = mkVariant({ name: "light" });
    const variantWebsite = mkVariant({ name: "website" });

    beforeEach(() => {
      site = createSite();
      styleToken = mkStyleToken({
        name: "primary",
        type: "Color",
        value: "#FF0000",
      });
      styleToken.variantedValues.push(
        new VariantedValue({
          variants: [variantWebsite],
          value: "#AA0000",
        }),
      );
      overridableToken = new OverrideableToken(styleToken, site);
    });
    describe("setValue, setVariantedValue", () => {
      describe("When no override exists, only create override if something changed", () => {
        it("setValue with same value as base token value - should not create override", () => {
          overridableToken.setValue(overridableToken.base.value);
          expect(overridableToken.override).toBeNull();
        });
        it("setValue with different value - should create override", () => {
          overridableToken.setValue("#00FF00");
          expect(overridableToken.override).toBeDefined();
          expect(overridableToken.override?.value).toBe("#00FF00");
          expect(overridableToken.override?.variantedValues).toHaveLength(0);
        });
        it("setVariantedValue with same value as base token value - should not create override", () => {
          overridableToken.setVariantedValue(
            [variantDark],
            overridableToken.base.value,
          );
          expect(overridableToken.override).toBeNull();
        });
        // Actual usecase: override varianted value against imported breakpoints
        it("setVariantedValue with same value as another imported varianted value for the same variant - should not create override", () => {
          overridableToken.setVariantedValue(
            [variantWebsite],
            overridableToken.base.variantedValues[0].value,
          );
          expect(overridableToken.override).toBeNull();

          // set a different value for the same variant, should create override
          overridableToken.setVariantedValue([variantWebsite], "#123456");
          expect(overridableToken.override).toBeDefined();
          expect(overridableToken.override?.value).toBeNull();
          expect(overridableToken.override?.variantedValues).toHaveLength(1);
          expect(overridableToken.override?.variantedValues[0].value).toBe(
            "#123456",
          );
        });
        it("setVariantedValue with different value - should create override", () => {
          overridableToken.setVariantedValue([variantDark], "#00FF00");
          expect(overridableToken.override?.variantedValues).toHaveLength(1);
          expect(overridableToken.override?.variantedValues[0].value).toBe(
            "#00FF00",
          );
        });
      });

      describe("Override already exists", () => {
        describe("Override has value only", () => {
          const originalOverrideValue = "#00FF00";
          beforeEach(() => {
            overridableToken.setValue(originalOverrideValue);
          });
          it("setValue to same as original base value - should remove override", () => {
            overridableToken.setValue(overridableToken.base.value);
            expect(overridableToken.override).toBeNull();
          });
          it("setValue to different value - should update override", () => {
            overridableToken.setValue("#0000FF");
            expect(overridableToken.override?.value).toBe("#0000FF");
            expect(overridableToken.override?.variantedValues).toHaveLength(0);
          });
          it("setVariantedValue to same as original base value - should create varianted value", () => {
            overridableToken.setVariantedValue(
              [variantDark],
              overridableToken.base.value,
            );
            expect(overridableToken.override?.value).toBe(
              originalOverrideValue,
            );
            expect(overridableToken.override?.variantedValues).toHaveLength(1);
            expect(overridableToken.override?.variantedValues[0].value).toBe(
              overridableToken.base.value,
            );
          });
          it("setVariantedValue to same as existing override value - should not create varianted value", () => {
            overridableToken.setVariantedValue(
              [variantDark],
              originalOverrideValue,
            );
            expect(overridableToken.override?.value).toBe(
              originalOverrideValue,
            );
            expect(overridableToken.override?.variantedValues).toHaveLength(0);
          });
          it("setVariantedValue to different value - should create varianted value", () => {
            overridableToken.setVariantedValue([variantDark], "#0000FF");
            expect(overridableToken.override?.value).toBe(
              originalOverrideValue,
            );
            expect(overridableToken.override?.variantedValues).toHaveLength(1);
            expect(overridableToken.override?.variantedValues[0].value).toBe(
              "#0000FF",
            );
          });
        });

        describe("override has varianted values only", () => {
          beforeEach(() => {
            overridableToken.setVariantedValue([variantDark], "#0000FF");
          });
          it("setVariantedValue to same as original base value - should remove varianted value, and also the override if no values are left", () => {
            // first add a new varianted value
            overridableToken.setVariantedValue([variantLight], "#FFFF00");
            expect(overridableToken.override?.value).toBeNull();
            expect(overridableToken.override?.variantedValues).toHaveLength(2);
            expect(overridableToken.override?.variantedValues[0].value).toBe(
              "#0000FF",
            );
            expect(overridableToken.override?.variantedValues[1].value).toBe(
              "#FFFF00",
            );
            // now set one of the varianted values to the original base value
            overridableToken.setVariantedValue(
              [variantDark],
              overridableToken.base.value,
            );
            // expect the override to be removed
            expect(overridableToken.override?.variantedValues).toHaveLength(1);
            expect(overridableToken.override?.variantedValues[0].value).toBe(
              "#FFFF00",
            );
            // now set the other varianted values to the original base value
            overridableToken.setVariantedValue(
              [variantLight],
              overridableToken.base.value,
            );
            // expect the override to be removed
            expect(overridableToken.override).toBeNull();
          });
          it("setVariantedValue to different value for same variant - should update varianted value", () => {
            overridableToken.setVariantedValue([variantDark], "#FFFF00");
            expect(overridableToken.override?.value).toBeNull();
            expect(overridableToken.override?.variantedValues).toHaveLength(1);
            expect(overridableToken.override?.variantedValues[0].value).toBe(
              "#FFFF00",
            );
          });
          it("setVariantedValue for different variant - should not affect existing varianted values, and create the new varianted value", () => {
            overridableToken.setVariantedValue([variantLight], "#FFFF00");
            expect(overridableToken.override?.value).toBeNull();
            expect(overridableToken.override?.variantedValues).toHaveLength(2);
            expect(overridableToken.override?.variantedValues[0].value).toBe(
              "#0000FF",
            );
            expect(overridableToken.override?.variantedValues[1].value).toBe(
              "#FFFF00",
            );
          });
          it("setValue to same as original base value - should not set value", () => {
            overridableToken.setValue(overridableToken.base.value);
            expect(overridableToken.override?.value).toBeNull();
            expect(overridableToken.override?.variantedValues).toHaveLength(1);
            expect(overridableToken.override?.variantedValues[0].value).toBe(
              "#0000FF",
            );
          });
          it("setValue to same as a varianted value - should set value, but remove the varianted value thats the same", () => {
            overridableToken.setValue("#0000FF");
            expect(overridableToken.override?.value).toBe("#0000FF");
            expect(overridableToken.override?.variantedValues).toHaveLength(0);
          });
          it("setValue to different value - should set value", () => {
            overridableToken.setValue("#FFFF00");
            expect(overridableToken.override?.value).toBe("#FFFF00");
            expect(overridableToken.override?.variantedValues).toHaveLength(1);
            expect(overridableToken.override?.variantedValues[0].value).toBe(
              "#0000FF",
            );
          });
        });

        describe("override has both base and varianted values", () => {
          beforeEach(() => {
            overridableToken.setValue("#00FF00");
            overridableToken.setVariantedValue([variantDark], "#0000FF");
          });
          it("setValue to same as original base value - should remove base override value, but keep varianted values", () => {
            overridableToken.setValue(overridableToken.base.value);
            expect(overridableToken.override?.value).toBeNull();
            expect(overridableToken.override?.variantedValues).toHaveLength(1);
            expect(overridableToken.override?.variantedValues[0].value).toBe(
              "#0000FF",
            );
          });
          it("setVariantedValue to same as existing override value - should remove varianted value but keep the override value", () => {
            overridableToken.setVariantedValue([variantDark], "#00FF00");
            expect(overridableToken.override?.value).toBe("#00FF00");
            expect(overridableToken.override?.variantedValues).toHaveLength(0);
          });
          it("setValue to same as a varianted value - should remove the varianted value but update the override value", () => {
            overridableToken.setValue("#0000FF");
            expect(overridableToken.override?.value).toBe("#0000FF");
            expect(overridableToken.override?.variantedValues).toHaveLength(0);
          });
        });
      });
    });

    describe("removeValue, removeVariantedValue", () => {
      beforeEach(() => {
        overridableToken.setValue("#00FF00");
      });
      it("removeValue - should only remove the override value", () => {
        overridableToken.setVariantedValue([variantDark], "#0000FF");
        expect(overridableToken.override?.value).toBe("#00FF00");
        expect(overridableToken.override?.variantedValues).toHaveLength(1);

        overridableToken.removeValue();
        expect(overridableToken.override?.value).toBeNull();
        expect(overridableToken.override?.variantedValues).toHaveLength(1);
        expect(overridableToken.override?.variantedValues[0].value).toBe(
          "#0000FF",
        );
      });
      it("removeValue - should remove override as well if no varianted values exist", () => {
        overridableToken.removeValue();
        expect(overridableToken.override).toBeNull();
      });
      it("removeValue - should remove varianted value if it is the same as the original token base value", () => {
        overridableToken.setVariantedValue([variantDark], styleToken.value);
        overridableToken.setVariantedValue([variantLight], "#0000FF");
        expect(overridableToken.override?.variantedValues).toHaveLength(2);
        expect(overridableToken.override?.variantedValues[0].value).toBe(
          styleToken.value,
        );
        expect(overridableToken.override?.variantedValues[1].value).toBe(
          "#0000FF",
        );

        overridableToken.removeValue();
        expect(overridableToken.override?.variantedValues).toHaveLength(1);
        expect(overridableToken.override?.variantedValues[0].value).toBe(
          "#0000FF",
        );
      });
      it("removeVariantedValue - should remove just the varianted value for the given variant", () => {
        overridableToken.setVariantedValue([variantDark], "#0000FF");
        overridableToken.setVariantedValue([variantLight], "#FFFF00");
        expect(overridableToken.override?.variantedValues).toHaveLength(2);
        expect(overridableToken.override?.variantedValues[0].value).toBe(
          "#0000FF",
        );
        expect(overridableToken.override?.variantedValues[1].value).toBe(
          "#FFFF00",
        );

        overridableToken.removeVariantedValue([variantDark]);
        expect(overridableToken.override?.value).toBe("#00FF00");
        expect(overridableToken.override?.variantedValues).toHaveLength(1);
        expect(overridableToken.override?.variantedValues[0].value).toBe(
          "#FFFF00",
        );
      });
      it("removeVariantedValue - should remove override if no values remain", () => {
        overridableToken.setVariantedValue([variantDark], "#0000FF");
        expect(overridableToken.override?.variantedValues).toHaveLength(1);
        overridableToken.removeValue();
        expect(overridableToken.override?.variantedValues).toHaveLength(1);
        overridableToken.removeVariantedValue([variantDark]);
        expect(overridableToken.override).toBeNull();
      });
      it("removeVariantedValue - when varianted value does not exist", () => {
        expect(overridableToken.override?.variantedValues).toHaveLength(0);
        overridableToken.removeVariantedValue([variantDark]);
        expect(overridableToken.override?.variantedValues).toHaveLength(0);
      });
      it("removeValue, removeVariantedValue - when override does not exist", () => {
        overridableToken.removeValue();
        expect(overridableToken.override).toBeNull();
        overridableToken.removeValue();
        overridableToken.removeVariantedValue([variantDark]);
        expect(overridableToken.override).toBeNull();
      });
    });
  });
});

describe("toFinalToken", () => {
  function mkDep(site: Site, name: string) {
    const dep = new ProjectDependency({
      name,
      projectId: `${name}-project`,
      uuid: `${name}-uuid`,
      pkgId: `${name}-pkg`,
      version: "0.0.1",
      site,
    });
    return dep;
  }

  function mkTokens() {
    const transitiveSite = createSite();
    const transitive = mkStyleToken({
      name: "t",
      type: "Color",
      value: "#000",
    });
    transitiveSite.styleTokens.push(transitive);

    const directSite = createSite();
    const direct = mkStyleToken({ name: "d", type: "Color", value: "#111" });
    directSite.styleTokens.push(direct);
    directSite.projectDependencies.push(mkDep(transitiveSite, "transitive"));

    const site = createSite();
    site.projectDependencies.push(mkDep(directSite, "direct"));
    const local = mkStyleToken({ name: "l", type: "Color", value: "#222" });
    const registered = mkStyleToken({
      name: "r",
      type: "Color",
      value: "#333",
    });
    registered.isRegistered = true;
    const orphan = mkStyleToken({ name: "o", type: "Color", value: "#444" });
    site.styleTokens.push(local, registered);

    const localData = mkDataToken({ name: "ld", value: "a" });
    const directData = mkDataToken({ name: "dd", value: "b" });
    site.dataTokens.push(localData);
    directSite.dataTokens.push(directData);
    return {
      site,
      styleTokens: [local, registered, direct, transitive, orphan],
      dataTokens: [localData, directData],
    };
  }

  const describeFinal = (t: {
    constructor: Function;
    base: unknown;
    isLocal: boolean;
  }) => [t.constructor.name, t.base, t.isLocal];

  function observed(site: Site) {
    return new ChangeRecorder({
      inst: site,
      _instUtil: instUtil,
      excludeFields: [meta.getFieldByName("ProjectDependency", "site")],
      excludeClasses: [],
      isExternalRef: () => false,
      skipInitialObserveFields: [],
      incremental: true,
      quiet: true,
    } as any);
  }

  describe.each([
    ["a plain site", (_site: Site) => () => undefined],
    [
      "an observable site",
      (site: Site) => {
        const recorder = observed(site);
        return () => recorder.dispose();
      },
    ],
  ])("on %s", (_label, prepare) => {
    it("classifies style tokens by where they live", () => {
      const { site, styleTokens } = mkTokens();
      const cleanup = prepare(site);
      const [local, registered, direct, transitive, orphan] = styleTokens;
      const finals = styleTokens.map((t) => toFinalToken(t, site));
      expect(finals.map(describeFinal)).toEqual([
        [MutableToken.name, local, true],
        [OverrideableToken.name, registered, false],
        [OverrideableToken.name, direct, false],
        [ImmutableToken.name, transitive, false],
        [ImmutableToken.name, orphan, false],
      ]);
      cleanup();
    });

    it("classifies style tokens the same with set membership as with scans", () => {
      const { site, styleTokens } = mkTokens();
      const cleanup = prepare(site);
      const shuffled = [...styleTokens].reverse();
      for (const tokens of [styleTokens, shuffled, [], [styleTokens[2]]]) {
        const expected = tokens.map((t) => toFinalToken(t, site));
        const isMember = setMembership();
        const actual = tokens.map((t) => toFinalToken(t, site, isMember));
        expect(actual.map(describeFinal)).toEqual(expected.map(describeFinal));
        actual.forEach((t, i) => {
          expect(t.constructor).toBe(expected[i].constructor);
          expect(t.base).toBe(tokens[i]);
        });
      }
      cleanup();
    });

    it("classifies data tokens the same with set membership as with scans", () => {
      const { site, dataTokens } = mkTokens();
      const cleanup = prepare(site);
      const isMember = setMembership();
      const actual = dataTokens.map((t) => toFinalToken(t, site, isMember));
      expect(actual.map(describeFinal)).toEqual(
        dataTokens.map((t) => describeFinal(toFinalToken(t, site))),
      );
      cleanup();
    });

    it("classifies data tokens by where they live", () => {
      const { site, dataTokens } = mkTokens();
      const cleanup = prepare(site);
      const finals = dataTokens.map((t) => toFinalToken(t, site));
      expect(finals.map(describeFinal)).toEqual([
        [MutableToken.name, dataTokens[0], true],
        [OverrideableToken.name, dataTokens[1], false],
      ]);
      cleanup();
    });
  });

  it("stops at the first dependency that holds the token, like a scan", () => {
    const { site, styleTokens } = mkTokens();
    const direct = styleTokens[2];
    const brokenDep = { site: undefined } as unknown as ProjectDependency;
    site.projectDependencies.push(brokenDep);
    expect(() => toFinalToken(direct, site)).not.toThrow();
    expect(() => toFinalToken(direct, site, setMembership())).not.toThrow();
    const orphan = styleTokens[4];
    expect(() => toFinalToken(orphan, site)).toThrow(TypeError);
    expect(() => toFinalToken(orphan, site, setMembership())).toThrow(
      TypeError,
    );
  });
});
