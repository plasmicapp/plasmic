import { mkScreenVariantGroup } from "@/wab/shared/SpecialVariants";
import { mkComponentVariantGroup } from "@/wab/shared/Variants";
import { makeCssClassNameForVariantCombo } from "@/wab/shared/codegen/react-p/class-names";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { ParamTypes, mkParam } from "@/wab/shared/core/lang";
import { mkTplTagX, trackComponentRoot } from "@/wab/shared/core/tpls";
import {
  Component,
  TplNode,
  Variant,
  VariantGroup,
} from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";

function expectMakeCssClassNameForVariantCombo(
  variantCombo: Variant[],
  { prefix, superComp }: { prefix?: string; superComp?: Component },
  expected: {
    loader: string;
    nonLoader: string;
  }
) {
  expect(
    makeCssClassNameForVariantCombo(variantCombo, {
      targetEnv: "loader",
      prefix,
      superComp,
    })
  ).toEqual(expected.loader);

  ["canvas" as const, "codegen" as const, "preview" as const].forEach(
    (targetEnv) => {
      expect(
        makeCssClassNameForVariantCombo(variantCombo, {
          targetEnv,
          prefix,
          superComp,
        })
      ).toEqual(expected.nonLoader);
    }
  );
}

describe("makeCssClassNameForVariantCombo", () => {
  it("works for empty variants", () => {
    expectMakeCssClassNameForVariantCombo(
      [],
      {},
      {
        loader: "",
        nonLoader: "",
      }
    );
  });

  it("works with prefix", () => {
    const opts = {
      prefix: "123",
    };
    const expected = {
      loader: "_123abcde",
      nonLoader: "_123___hovered",
    };

    expectMakeCssClassNameForVariantCombo(
      [
        mkVariant({
          uuid: "abcdef",
          name: "",
          selectors: ["Hovered"],
        }),
      ],
      opts,
      expected
    );
    expectMakeCssClassNameForVariantCombo(
      [
        mkVariant({
          uuid: "abcdef",
          name: "",
          codeComponentName: "name",
          codeComponentVariantKeys: ["Hovered"],
        }),
      ],
      opts,
      expected
    );
  });

  describe("with variants with selectors", () => {
    it("works for variant with 1 selector", () => {
      expectMakeCssClassNameForVariantCombo(
        [
          mkVariant({
            uuid: "12345678",
            name: "",
            selectors: ["Hovered"],
          }),
        ],
        {},
        {
          loader: "_12345",
          nonLoader: "___hovered",
        }
      );
    });
    it("works for variant with 2 selectors", () => {
      expectMakeCssClassNameForVariantCombo(
        [
          mkVariant({
            uuid: "12345678",
            name: "",
            selectors: ["Hovered", "Focused Within"],
          }),
        ],
        {},
        {
          loader: "_12345",
          nonLoader: "___hovered__focusedWithin",
        }
      );
    });
  });

  describe("with code component variants", () => {
    it("works for variant with 1 variant key", () => {
      expectMakeCssClassNameForVariantCombo(
        [
          mkVariant({
            uuid: "12345678",
            name: "",
            codeComponentName: "name",
            codeComponentVariantKeys: ["Hovered"],
          }),
        ],
        {},
        {
          loader: "_12345",
          nonLoader: "___hovered",
        }
      );
    });
    it("works for variant with 2 varaint keys", () => {
      expectMakeCssClassNameForVariantCombo(
        [
          mkVariant({
            uuid: "12345678",
            name: "",
            codeComponentName: "name",
            codeComponentVariantKeys: ["Hovered", "Focused Within"],
          }),
        ],
        {},
        {
          loader: "_12345",
          nonLoader: "___hovered__focusedWithin",
        }
      );
    });
  });

  describe("with component variants", () => {
    let component: Component;
    let variant1, variant2: Variant;
    beforeEach(() => {
      component = mkComponent({
        name: "my component",
        type: ComponentType.Plain,
        tplTree: mkTplTagX("div", {}),
      });
      trackComponentRoot(component);

      const variantGroup = mkComponentVariantGroup({
        param: mkParam({
          name: "component variant group",
          type: typeFactory.text(),
          paramType: ParamTypes.State,
        }),
      });
      component.variantGroups.push(variantGroup);

      variant1 = mkVariant({
        uuid: "var1",
        name: "Variant 1",
        parent: variantGroup,
      });
      variant2 = mkVariant({
        uuid: "var2",
        name: "Variant 2",
        parent: variantGroup,
      });
      component.variants.push(variant1, variant2);
    });
    it("works for 1 component variant", () => {
      expectMakeCssClassNameForVariantCombo(
        [variant1],
        {
          superComp: component,
        },
        {
          loader: "var1",
          nonLoader: "MyComponent__componentVariantGroup_variant1",
        }
      );
    });
    it("works for 2 component variants", () => {
      expectMakeCssClassNameForVariantCombo(
        [variant1, variant2],
        {
          superComp: component,
        },
        {
          loader: "var1_var2",
          nonLoader:
            "MyComponent__componentVariantGroup_variant1_MyComponent__componentVariantGroup_variant2",
        }
      );
    });
  });

  describe("with global variants", () => {
    let mobileVariant, desktopVariant: Variant;
    beforeEach(() => {
      const screenVariantGroup = mkScreenVariantGroup();
      mobileVariant = mkVariant({
        uuid: "123mobile",
        name: "Mobile",
        parent: screenVariantGroup,
      });
      desktopVariant = mkVariant({
        uuid: "456desktop",
        name: "Desktop",
        parent: screenVariantGroup,
      });
      screenVariantGroup.variants.push(mobileVariant);
    });
    it("works for 1 global variant", () => {
      expectMakeCssClassNameForVariantCombo(
        [mobileVariant],
        {},
        {
          loader: "_123mo",
          nonLoader: "global_screen_mobile",
        }
      );
      expectMakeCssClassNameForVariantCombo(
        [desktopVariant],
        {},
        {
          loader: "_456de",
          nonLoader: "global_screen_desktop",
        }
      );
    });
    it("works for 2 global variants by sorting uuid", () => {
      expectMakeCssClassNameForVariantCombo(
        [mobileVariant, desktopVariant],
        {},
        {
          loader: "_123mo_456de",
          nonLoader: "global_screen_mobile_global_screen_desktop",
        }
      );
    });
  });
});

function mkVariant({
  uuid,
  name,
  selectors,
  codeComponentName,
  codeComponentVariantKeys,
  parent,
  mediaQuery,
  description,
  forTpl,
}: {
  uuid: string;
  name: string;
  selectors?: string[];
  codeComponentName?: string;
  codeComponentVariantKeys?: string[] | null;
  parent?: VariantGroup;
  mediaQuery?: string | null;
  description?: string | null;
  forTpl?: TplNode | null;
}) {
  return new Variant({
    uuid,
    name,
    selectors,
    codeComponentName,
    codeComponentVariantKeys,
    parent,
    mediaQuery,
    description,
    forTpl,
  });
}
