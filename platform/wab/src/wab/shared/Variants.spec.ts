import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { mkParam } from "@/wab/shared/core/lang";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { PropParam, StateParam } from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import {
  CodeComponentVariant,
  ensureValidCombo,
  isMaybeInteractiveCodeComponentVariant,
  isParamCompatibleWithVariantGroup,
  mkBaseVariant,
  mkComponentVariantGroup,
  mkVariant,
  variantGroupToLinkedPropType,
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
  describe("isMaybeInteractiveCodeComponentVariant", () => {
    it("should return true for interactive style variants", () => {
      expect(
        isMaybeInteractiveCodeComponentVariant(
          mkVariant({
            name: "",
            codeComponentName: "name",
            codeComponentVariantKeys: ["HoveReffect"],
          }) as CodeComponentVariant
        )
      ).toBe(true);
      expect(
        isMaybeInteractiveCodeComponentVariant(
          mkVariant({
            name: "",
            codeComponentName: "name",
            codeComponentVariantKeys: ["pressEd"],
          }) as CodeComponentVariant
        )
      ).toBe(true);
      expect(
        isMaybeInteractiveCodeComponentVariant(
          mkVariant({
            name: "",
            codeComponentName: "name",
            codeComponentVariantKeys: ["12345", "focused"],
          }) as CodeComponentVariant
        )
      ).toBe(true);
      expect(
        isMaybeInteractiveCodeComponentVariant(
          mkVariant({
            name: "",
            codeComponentName: "name",
            codeComponentVariantKeys: ["wertrty", "focus-visible"],
          }) as CodeComponentVariant
        )
      ).toBe(true);
      expect(
        isMaybeInteractiveCodeComponentVariant(
          mkVariant({
            name: "",
            codeComponentName: "name",
            codeComponentVariantKeys: ["sdfghxcvb", "place-left"],
          }) as CodeComponentVariant
        )
      ).toBe(false);
      expect(
        isMaybeInteractiveCodeComponentVariant(
          mkVariant({
            name: "",
            codeComponentName: "name",
            codeComponentVariantKeys: ["yuioijhgf", "indeterminate"],
          }) as CodeComponentVariant
        )
      ).toBe(false);
      expect(
        isMaybeInteractiveCodeComponentVariant(
          mkVariant({
            name: "",
            codeComponentName: "name",
            codeComponentVariantKeys: ["jhgvfcvbn", "selected"],
          }) as CodeComponentVariant
        )
      ).toBe(false);
      expect(
        isMaybeInteractiveCodeComponentVariant(
          mkVariant({
            name: "",
            codeComponentName: "name",
            codeComponentVariantKeys: [
              "dsgj ksdgj ksdjg ksdjgk jsdkgj sdkjg ksd",
              "sdghjsdg",
              "dshgjsdhgs",
            ],
          }) as CodeComponentVariant
        )
      ).toBe(false);
      expect(
        isMaybeInteractiveCodeComponentVariant(
          mkVariant({
            name: "",
            codeComponentName: "name",
            codeComponentVariantKeys: [],
          }) as CodeComponentVariant
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

  describe("variantGroupToLinkedPropType", () => {
    it("maps a standalone (toggle) group to a bool prop", () => {
      const standaloneGroup = mkLinkGroup({
        name: "Locked",
        variants: ["Locked"],
      });
      expect(variantGroupToLinkedPropType(standaloneGroup).name).toBe("bool");
    });

    it("maps a single-select group to a choice over the variant names", () => {
      const singleGroup = mkLinkGroup({
        name: "Theme",
        variants: ["primary", "secondary"],
      });
      const type = variantGroupToLinkedPropType(singleGroup);
      expect(type.name).toBe("choice");
      expect((type as any).options).toEqual([
        { label: "primary", value: "primary" },
        { label: "secondary", value: "secondary" },
      ]);
    });

    it("maps a multi-select group to a multiChoice over the variant names", () => {
      const multiGroup = mkLinkGroup({
        name: "Theme",
        variants: ["primary", "secondary"],
        multi: true,
      });
      const type = variantGroupToLinkedPropType(multiGroup);
      expect(type.name).toBe("multiChoice");
      expect((type as any).options).toEqual([
        { label: "primary", value: "primary" },
        { label: "secondary", value: "secondary" },
      ]);
    });
  });

  describe("isParamCompatibleWithVariantGroup", () => {
    // Standalone: a single variant whose name equals the group's param name.
    const standaloneGroup = mkLinkGroup({
      name: "Locked",
      variants: ["Locked"],
    });
    const singleGroup = mkLinkGroup({
      name: "Theme",
      variants: ["primary", "secondary"],
    });
    const multiGroup = mkLinkGroup({
      name: "Theme",
      variants: ["primary", "secondary"],
      multi: true,
    });

    describe("standalone (toggle) group", () => {
      it("matches a bool param", () => {
        expect(
          isParamCompatibleWithVariantGroup(
            linkPropParam(typeFactory.bool()),
            standaloneGroup
          )
        ).toBe(true);
      });
      it("rejects a choice param", () => {
        expect(
          isParamCompatibleWithVariantGroup(
            linkPropParam(typeFactory.choice(["Locked"])),
            standaloneGroup
          )
        ).toBe(false);
      });
      it("rejects a text param", () => {
        expect(
          isParamCompatibleWithVariantGroup(
            linkPropParam(typeFactory.text()),
            standaloneGroup
          )
        ).toBe(false);
      });
    });

    describe("single-select group", () => {
      it("matches a choice param with the same options", () => {
        expect(
          isParamCompatibleWithVariantGroup(
            linkPropParam(typeFactory.choice(["primary", "secondary"])),
            singleGroup
          )
        ).toBe(true);
      });
      it("rejects a multiChoice param (single/multi mismatch)", () => {
        expect(
          isParamCompatibleWithVariantGroup(
            linkPropParam(typeFactory.multiChoice(["primary", "secondary"])),
            singleGroup
          )
        ).toBe(false);
      });
      it("rejects a choice param with different options", () => {
        expect(
          isParamCompatibleWithVariantGroup(
            linkPropParam(typeFactory.choice(["primary", "tertiary"])),
            singleGroup
          )
        ).toBe(false);
      });
      it("rejects a bool param", () => {
        expect(
          isParamCompatibleWithVariantGroup(
            linkPropParam(typeFactory.bool()),
            singleGroup
          )
        ).toBe(false);
      });
    });

    describe("multi-select group", () => {
      it("matches a multiChoice param with the same options", () => {
        expect(
          isParamCompatibleWithVariantGroup(
            linkPropParam(typeFactory.multiChoice(["primary", "secondary"])),
            multiGroup
          )
        ).toBe(true);
      });
      it("rejects a choice param (single/multi mismatch)", () => {
        expect(
          isParamCompatibleWithVariantGroup(
            linkPropParam(typeFactory.choice(["primary", "secondary"])),
            multiGroup
          )
        ).toBe(false);
      });
    });
  });
});

function linkPropParam(type: PropParam["type"]) {
  return mkParam({ name: "p", type, paramType: "prop" });
}

function mkLinkGroup(opts: {
  name: string;
  variants: string[];
  multi?: boolean;
}) {
  return mkComponentVariantGroup({
    param: mkParam({
      name: opts.name,
      type: typeFactory.text(),
      paramType: "state",
    }),
    multi: opts.multi ?? false,
    variants: opts.variants.map((name) => mkVariant({ name })),
  });
}
