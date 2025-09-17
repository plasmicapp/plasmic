import { TokenValue } from "@/wab/commons/StyleToken";
import { DeepReadonly } from "@/wab/commons/types";
import { RuleSetHelpers } from "@/wab/shared/RuleSetHelpers";
import { isValidComboForToken } from "@/wab/shared/Variants";
import {
  arrayEqIgnoreOrder,
  assert,
  ensure,
  ensureArray,
  last,
} from "@/wab/shared/common";
import { cloneRuleSet } from "@/wab/shared/core/styles";
import { FinalToken, ImmutableToken } from "@/wab/shared/core/tokens";
import {
  Mixin,
  RuleSet,
  Site,
  StyleToken,
  Variant,
  VariantedRuleSet,
  VariantedValue,
  isKnownMixin,
} from "@/wab/shared/model/classes";
import {
  isAncestorCombo,
  makeGlobalVariantComboSorter,
} from "@/wab/shared/variant-sort";

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

  private activeVariantedStyles(style: FinalToken<StyleToken> | Mixin) {
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

  private sortedActiveVariantedStyles(style: FinalToken<StyleToken> | Mixin) {
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

  sortedActiveVariantedValue(token: FinalToken<StyleToken>) {
    return this.sortedActiveVariantedStyles(token) as VariantedValue[];
  }

  sortedActiveVariantedRuleSet(mixin: Mixin) {
    return this.sortedActiveVariantedStyles(mixin) as VariantedRuleSet[];
  }

  private getVariantedStyleWithHighestPriority(
    style: FinalToken<StyleToken> | Mixin
  ) {
    const sortedActiveVariantedValues = this.sortedActiveVariantedStyles(style);
    return sortedActiveVariantedValues.length > 0
      ? last(sortedActiveVariantedValues)
      : undefined;
  }

  getVariantedValueWithHighestPriority(token: FinalToken<StyleToken>) {
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
  isStyleInherited(token: FinalToken<StyleToken> | Mixin) {
    return !arrayEqIgnoreOrder(
      this.getVariantedStyleWithHighestPriority(token)?.variants ?? [],
      this.activeGlobalVariants ?? []
    );
  }

  getActiveTokenValue(token: FinalToken<StyleToken>): TokenValue {
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

  updateToken(token: FinalToken<StyleToken>, value: string): void {
    assert(
      !(token instanceof ImmutableToken),
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

  removeVariantedValue(token: FinalToken<StyleToken>): void {
    assert(
      !(token instanceof ImmutableToken),
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
              animations: [],
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
