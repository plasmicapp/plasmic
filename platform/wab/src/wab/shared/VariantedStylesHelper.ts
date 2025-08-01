import {
  FinalStyleToken,
  ImmutableStyleToken,
  TokenValue,
} from "@/wab/commons/StyleToken";
import { DeepReadonly } from "@/wab/commons/types";
import {
  arrayEqIgnoreOrder,
  assert,
  ensure,
  ensureArray,
  last,
} from "@/wab/shared/common";
import { cloneRuleSet } from "@/wab/shared/core/styles";
import {
  isKnownMixin,
  Mixin,
  RuleSet,
  Site,
  Variant,
  VariantedRuleSet,
  VariantedValue,
} from "@/wab/shared/model/classes";
import { RuleSetHelpers } from "@/wab/shared/RuleSetHelpers";
import {
  isAncestorCombo,
  makeGlobalVariantComboSorter,
} from "@/wab/shared/variant-sort";
import { isValidComboForToken } from "@/wab/shared/Variants";

export class VariantedStylesHelper {
  constructor(
    private site?: Site,
    private activeGlobalVariants?: Variant[],
    private targetGlobalVariants?: Variant[]
  ) {}

  key = () =>
    JSON.stringify(this.activeGlobalVariants?.map((v) => v.uuid).sort() ?? []);

  isActiveBaseVariant = () =>
    !this.activeGlobalVariants || this.activeGlobalVariants.length === 0;

  isTargetBaseVariant = () =>
    !this.targetGlobalVariants || this.targetGlobalVariants.length === 0;

  globalVariants = () => this.activeGlobalVariants;

  private activeVariantedStyles(style: FinalStyleToken | Mixin) {
    if (this.isActiveBaseVariant() || !this.site) {
      return [];
    }

    const variantedStyle = (
      isKnownMixin(style) ? style.variantedRs : style.variantedValues
    ) as (VariantedValue | VariantedRuleSet)[];

    return variantedStyle.filter((variantedValue) =>
      isAncestorCombo(
        ensure(
          this.activeGlobalVariants,
          "Active global variants must be specified"
        ),
        variantedValue.variants
      )
    );
  }

  private sortedActiveVariantedStyles(style: FinalStyleToken | Mixin) {
    const activeVariantedValues = this.activeVariantedStyles(style);
    if (activeVariantedValues.length === 0) {
      return activeVariantedValues;
    }

    const sorter = makeGlobalVariantComboSorter(
      ensure(this.site, "site must exist to sort variants")
    );
    return activeVariantedValues.sort((a, b) =>
      sorter(a.variants) < sorter(b.variants) ? -1 : 1
    );
  }

  sortedActiveVariantedValue(token: FinalStyleToken) {
    return this.sortedActiveVariantedStyles(token) as VariantedValue[];
  }

  sortedActiveVariantedRuleSet(mixin: Mixin) {
    return this.sortedActiveVariantedStyles(mixin) as VariantedRuleSet[];
  }

  private getVariantedStyleWithHighestPriority(style: FinalStyleToken | Mixin) {
    const sortedActiveVariantedValues = this.sortedActiveVariantedStyles(style);
    return sortedActiveVariantedValues.length > 0
      ? last(sortedActiveVariantedValues)
      : undefined;
  }

  getVariantedValueWithHighestPriority(token: FinalStyleToken) {
    return this.getVariantedStyleWithHighestPriority(token) as
      | VariantedValue
      | undefined;
  }

  getVariantedRuleSetWithHighestPriority(mixin: Mixin) {
    return this.getVariantedStyleWithHighestPriority(mixin) as
      | VariantedRuleSet
      | undefined;
  }

  /**
   * @returns true if the token has no varianted value against the currently active global variant
   */
  isStyleInherited(token: FinalStyleToken | Mixin) {
    return !arrayEqIgnoreOrder(
      this.getVariantedStyleWithHighestPriority(token)?.variants ?? [],
      this.activeGlobalVariants ?? []
    );
  }

  getActiveTokenValue(token: FinalStyleToken): TokenValue {
    return (this.getVariantedValueWithHighestPriority(token)?.value ??
      token.value) as TokenValue;
  }

  canUpdateToken(): boolean {
    return (
      this.isTargetBaseVariant() ||
      (!!this.targetGlobalVariants &&
        isValidComboForToken(this.targetGlobalVariants))
    );
  }

  updateToken(token: FinalStyleToken, value: string): void {
    assert(
      !(token instanceof ImmutableStyleToken),
      `cannot update token "${token.name}" from transitive dep`
    );

    if (this.isTargetBaseVariant()) {
      token.setValue(value);
    } else {
      assert(
        this.canUpdateToken(),
        `cannot update token "${token.name}" with target global variants "${
          this.targetGlobalVariants?.map((v) => v.name).join(",") ?? "base"
        }"`
      );

      token.setVariantedValue(ensureArray(this.targetGlobalVariants), value);
    }
  }

  removeVariantedValue(token: FinalStyleToken): void {
    assert(
      !(token instanceof ImmutableStyleToken),
      `cannot update token "${token.name}" from transitive dep`
    );
    token.removeVariantedValue(ensureArray(this.targetGlobalVariants));
  }

  updateMixinRule(
    mixin: Mixin,
    prop: string,
    value: string | undefined | null
  ) {
    const variantedRs = mixin.variantedRs.find((vRs) =>
      arrayEqIgnoreOrder(vRs.variants, ensureArray(this.targetGlobalVariants))
    );
    const activeRuleSet = this.isTargetBaseVariant()
      ? mixin.rs
      : variantedRs?.rs;

    if (!value) {
      delete ensure(
        activeRuleSet,
        "Active rule set must already exist if deleting values"
      ).values[prop];
    } else {
      if (!activeRuleSet) {
        mixin.variantedRs.push(
          new VariantedRuleSet({
            variants: ensure(
              this.targetGlobalVariants,
              "Must be targeting variants"
            ),
            rs: new RuleSet({
              values: {},
              mixins: mixin.rs.mixins,
            }),
          })
        );
      }
      const rs = activeRuleSet ?? last(mixin.variantedRs).rs;
      rs.values[prop] = value;
    }
  }

  getActiveVariantedRuleSet = (mixin: Mixin): DeepReadonly<RuleSet> => {
    if (!this.site || !mixin.variantedRs) {
      return mixin.rs;
    }

    const sortedActiveVariantedRs = this.sortedActiveVariantedStyles(
      mixin
    ) as VariantedRuleSet[];
    const rs = cloneRuleSet(mixin.rs) as RuleSet;
    const rsh = new RuleSetHelpers(rs, "");
    for (const variantedRs of sortedActiveVariantedRs) {
      rsh.mergeRs(variantedRs.rs);
    }
    return rs;
  };
}
