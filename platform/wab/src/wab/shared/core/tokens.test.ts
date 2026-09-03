import { mkStyleToken } from "@/wab/commons/StyleToken";
import { mkVariant } from "@/wab/shared/Variants";
import { createSite } from "@/wab/shared/core/sites";
import { MutableToken, OverrideableToken } from "@/wab/shared/core/tokens";
import { Site, StyleToken, VariantedValue } from "@/wab/shared/model/classes";

describe("tokens", () => {
  it("Mutable tokens - setValue, setVariantedValue", () => {
    const variantDark = mkVariant({ name: "dark" });
    const variantLight = mkVariant({ name: "light" });
    const token = new MutableToken(
      mkStyleToken({
        name: "primary",
        type: "Color",
        value: "#FF0000",
      })
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
        })
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
            overridableToken.base.value
          );
          expect(overridableToken.override).toBeNull();
        });
        // Actual usecase: override varianted value against imported breakpoints
        it("setVariantedValue with same value as another imported varianted value for the same variant - should not create override", () => {
          overridableToken.setVariantedValue(
            [variantWebsite],
            overridableToken.base.variantedValues[0].value
          );
          expect(overridableToken.override).toBeNull();

          // set a different value for the same variant, should create override
          overridableToken.setVariantedValue([variantWebsite], "#123456");
          expect(overridableToken.override).toBeDefined();
          expect(overridableToken.override?.value).toBeNull();
          expect(overridableToken.override?.variantedValues).toHaveLength(1);
          expect(overridableToken.override?.variantedValues[0].value).toBe(
            "#123456"
          );
        });
        it("setVariantedValue with different value - should create override", () => {
          overridableToken.setVariantedValue([variantDark], "#00FF00");
          expect(overridableToken.override?.variantedValues).toHaveLength(1);
          expect(overridableToken.override?.variantedValues[0].value).toBe(
            "#00FF00"
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
              overridableToken.base.value
            );
            expect(overridableToken.override?.value).toBe(
              originalOverrideValue
            );
            expect(overridableToken.override?.variantedValues).toHaveLength(1);
            expect(overridableToken.override?.variantedValues[0].value).toBe(
              overridableToken.base.value
            );
          });
          it("setVariantedValue to same as existing override value - should not create varianted value", () => {
            overridableToken.setVariantedValue(
              [variantDark],
              originalOverrideValue
            );
            expect(overridableToken.override?.value).toBe(
              originalOverrideValue
            );
            expect(overridableToken.override?.variantedValues).toHaveLength(0);
          });
          it("setVariantedValue to different value - should create varianted value", () => {
            overridableToken.setVariantedValue([variantDark], "#0000FF");
            expect(overridableToken.override?.value).toBe(
              originalOverrideValue
            );
            expect(overridableToken.override?.variantedValues).toHaveLength(1);
            expect(overridableToken.override?.variantedValues[0].value).toBe(
              "#0000FF"
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
              "#0000FF"
            );
            expect(overridableToken.override?.variantedValues[1].value).toBe(
              "#FFFF00"
            );
            // now set one of the varianted values to the original base value
            overridableToken.setVariantedValue(
              [variantDark],
              overridableToken.base.value
            );
            // expect the override to be removed
            expect(overridableToken.override?.variantedValues).toHaveLength(1);
            expect(overridableToken.override?.variantedValues[0].value).toBe(
              "#FFFF00"
            );
            // now set the other varianted values to the original base value
            overridableToken.setVariantedValue(
              [variantLight],
              overridableToken.base.value
            );
            // expect the override to be removed
            expect(overridableToken.override).toBeNull();
          });
          it("setVariantedValue to different value for same variant - should update varianted value", () => {
            overridableToken.setVariantedValue([variantDark], "#FFFF00");
            expect(overridableToken.override?.value).toBeNull();
            expect(overridableToken.override?.variantedValues).toHaveLength(1);
            expect(overridableToken.override?.variantedValues[0].value).toBe(
              "#FFFF00"
            );
          });
          it("setVariantedValue for different variant - should not affect existing varianted values, and create the new varianted value", () => {
            overridableToken.setVariantedValue([variantLight], "#FFFF00");
            expect(overridableToken.override?.value).toBeNull();
            expect(overridableToken.override?.variantedValues).toHaveLength(2);
            expect(overridableToken.override?.variantedValues[0].value).toBe(
              "#0000FF"
            );
            expect(overridableToken.override?.variantedValues[1].value).toBe(
              "#FFFF00"
            );
          });
          it("setValue to same as original base value - should not set value", () => {
            overridableToken.setValue(overridableToken.base.value);
            expect(overridableToken.override?.value).toBeNull();
            expect(overridableToken.override?.variantedValues).toHaveLength(1);
            expect(overridableToken.override?.variantedValues[0].value).toBe(
              "#0000FF"
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
              "#0000FF"
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
              "#0000FF"
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
          "#0000FF"
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
          styleToken.value
        );
        expect(overridableToken.override?.variantedValues[1].value).toBe(
          "#0000FF"
        );

        overridableToken.removeValue();
        expect(overridableToken.override?.variantedValues).toHaveLength(1);
        expect(overridableToken.override?.variantedValues[0].value).toBe(
          "#0000FF"
        );
      });
      it("removeVariantedValue - should remove just the varianted value for the given variant", () => {
        overridableToken.setVariantedValue([variantDark], "#0000FF");
        overridableToken.setVariantedValue([variantLight], "#FFFF00");
        expect(overridableToken.override?.variantedValues).toHaveLength(2);
        expect(overridableToken.override?.variantedValues[0].value).toBe(
          "#0000FF"
        );
        expect(overridableToken.override?.variantedValues[1].value).toBe(
          "#FFFF00"
        );

        overridableToken.removeVariantedValue([variantDark]);
        expect(overridableToken.override?.value).toBe("#00FF00");
        expect(overridableToken.override?.variantedValues).toHaveLength(1);
        expect(overridableToken.override?.variantedValues[0].value).toBe(
          "#FFFF00"
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
