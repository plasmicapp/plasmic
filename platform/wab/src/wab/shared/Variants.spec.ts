import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { StateParam } from "@/wab/shared/model/classes";
import {
  ensureValidCombo,
  isMaybeInteractiveStyleVariant,
  mkBaseVariant,
  mkComponentVariantGroup,
  mkVariant,
} from "@/wab/shared/Variants";

function getComponentWithVariantGroups() {
  const singleChoiceVariants = [0, 1, 2].map((i) => {
    return mkVariant({
      name: `single-variant${i}`,
    });
  });

  const singleGroup = mkComponentVariantGroup({
    // The param is neglible for this test
    param: {} as StateParam,
    multi: false,
    variants: singleChoiceVariants,
  });

  const multiChoiceVariants = [0, 1, 2].map((i) => {
    return mkVariant({
      name: `multi-variant${i}`,
    });
  });

  const multiGroup = mkComponentVariantGroup({
    // The param is neglible for this test
    param: {} as StateParam,
    multi: true,
    variants: multiChoiceVariants,
  });

  const selectorVariant = mkVariant({
    name: "selector",
  });

  const baseVariant = mkBaseVariant();

  const component = mkComponent({
    name: "component",
    type: ComponentType.Plain,
    params: [],
    variants: [baseVariant, selectorVariant],
    variantGroups: [singleGroup, multiGroup],
    tplTree: mkTplTagX("div", {}),
  });

  return {
    component,
    singleGroup,
    multiGroup,
    baseVariant,
    selectorVariant,
  };
}

describe("Variants", () => {
  describe("isMaybeInteractiveStyleVariant", () => {
    it("should return true for interactive style variants", () => {
      expect(
        isMaybeInteractiveStyleVariant(
          mkVariant({
            name: "",
            selectors: ["HoveReffect"],
          })
        )
      ).toBe(true);
      expect(
        isMaybeInteractiveStyleVariant(
          mkVariant({
            name: "",
            selectors: ["pressEd"],
          })
        )
      ).toBe(true);
      expect(
        isMaybeInteractiveStyleVariant(
          mkVariant({
            name: "",
            selectors: ["12345", "focused"],
          })
        )
      ).toBe(true);
      expect(
        isMaybeInteractiveStyleVariant(
          mkVariant({
            name: "",
            selectors: ["wertrty", "focus-visible"],
          })
        )
      ).toBe(true);
      expect(
        isMaybeInteractiveStyleVariant(
          mkVariant({
            name: "",
            selectors: ["sdfghxcvb", "place-left"],
          })
        )
      ).toBe(false);
      expect(
        isMaybeInteractiveStyleVariant(
          mkVariant({
            name: "",
            selectors: ["yuioijhgf", "indeterminate"],
          })
        )
      ).toBe(false);
      expect(
        isMaybeInteractiveStyleVariant(
          mkVariant({
            name: "",
            selectors: ["jhgvfcvbn", "selected"],
          })
        )
      ).toBe(false);
      expect(
        isMaybeInteractiveStyleVariant(
          mkVariant({
            name: "",
            selectors: [
              "dsgj ksdgj ksdjg ksdjgk jsdkgj sdkjg ksd",
              "sdghjsdg",
              "dshgjsdhgs",
            ],
          })
        )
      ).toBe(false);
      expect(
        isMaybeInteractiveStyleVariant(
          mkVariant({
            name: "",
            selectors: [],
          })
        )
      ).toBe(false);
    });
  });
  describe("ensureValidCombo", () => {
    it("should return a valid subset of variants", () => {
      const {
        component,
        singleGroup,
        multiGroup,
        baseVariant,
        selectorVariant,
      } = getComponentWithVariantGroups();

      expect(ensureValidCombo(component, [])).toMatchObject([
        expect.objectContaining({ uuid: baseVariant.uuid }),
      ]);

      expect(ensureValidCombo(component, [baseVariant])).toMatchObject([
        expect.objectContaining({ uuid: baseVariant.uuid }),
      ]);

      expect(ensureValidCombo(component, [selectorVariant])).toMatchObject([
        expect.objectContaining({ uuid: selectorVariant.uuid }),
      ]);

      expect(
        ensureValidCombo(component, [selectorVariant, baseVariant])
      ).toMatchObject([
        expect.objectContaining({ uuid: selectorVariant.uuid }),
      ]);

      expect(
        ensureValidCombo(component, [singleGroup.variants[0]])
      ).toMatchObject([
        expect.objectContaining({ uuid: singleGroup.variants[0].uuid }),
      ]);

      expect(
        ensureValidCombo(component, [singleGroup.variants[0], baseVariant])
      ).toMatchObject([
        expect.objectContaining({ uuid: singleGroup.variants[0].uuid }),
      ]);

      expect(
        ensureValidCombo(component, [multiGroup.variants[0]])
      ).toMatchObject([
        expect.objectContaining({ uuid: multiGroup.variants[0].uuid }),
      ]);

      expect(
        ensureValidCombo(component, [
          singleGroup.variants[0],
          singleGroup.variants[1],
        ])
      ).toMatchObject([
        expect.objectContaining({ uuid: singleGroup.variants[0].uuid }),
      ]);

      expect(
        ensureValidCombo(component, [
          multiGroup.variants[0],
          multiGroup.variants[1],
        ])
      ).toMatchObject([
        expect.objectContaining({ uuid: multiGroup.variants[0].uuid }),
        expect.objectContaining({ uuid: multiGroup.variants[1].uuid }),
      ]);

      expect(
        ensureValidCombo(component, [
          multiGroup.variants[0],
          multiGroup.variants[0],
        ])
      ).toMatchObject([
        expect.objectContaining({ uuid: multiGroup.variants[0].uuid }),
      ]);

      expect(
        ensureValidCombo(component, [
          baseVariant,
          singleGroup.variants[0],
          multiGroup.variants[0],
          selectorVariant,
          singleGroup.variants[1],
          multiGroup.variants[1],
        ])
      ).toMatchObject([
        expect.objectContaining({ uuid: singleGroup.variants[0].uuid }),
        expect.objectContaining({ uuid: multiGroup.variants[0].uuid }),
        expect.objectContaining({ uuid: selectorVariant.uuid }),
        expect.objectContaining({ uuid: multiGroup.variants[1].uuid }),
      ]);
    });
  });
});
