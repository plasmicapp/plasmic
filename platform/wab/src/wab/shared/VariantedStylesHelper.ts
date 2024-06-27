import {
  arrayEqIgnoreOrder,
  ensure,
  ensureArray,
  last,
  remove,
} from "@/wab/shared/common";
import { TokenValue } from "@/wab/commons/StyleToken";
import { DeepReadonly } from "@/wab/commons/types";
import {
  isKnownStyleToken,
  Mixin,
  RuleSet,
  Site,
  StyleToken,
  Variant,
  VariantedRuleSet,
  VariantedValue,
} from "@/wab/shared/model/classes";
import { RuleSetHelpers } from "@/wab/shared/RuleSetHelpers";
import {
  isAncestorCombo,
  makeGlobalVariantComboSorter,
} from "@/wab/shared/variant-sort";
import { cloneRuleSet } from "@/wab/shared/core/styles";

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

  private activeVariantedStyles(style: StyleToken | Mixin) {
    if (this.isActiveBaseVariant() || !this.site) {
      return [];
    }

    const variantedStyle = (
      isKnownStyleToken(style) ? style.variantedValues : style.variantedRs
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

  activeVariantedValue(token: StyleToken) {
    return this.activeVariantedStyles(token) as VariantedValue[];
  }

  activeVariantedRuleSet(mixin: Mixin) {
    return this.activeVariantedStyles(mixin) as VariantedRuleSet[];
  }

  private sortedActiveVariantedStyles(style: StyleToken | Mixin) {
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

  sortedActiveVariantedValue(token: StyleToken) {
    return this.sortedActiveVariantedStyles(token) as VariantedValue[];
  }

  sortedActiveVariantedRuleSet(mixin: Mixin) {
    return this.sortedActiveVariantedStyles(mixin) as VariantedRuleSet[];
  }

  private getVariantedStyleWithHighestPriority(style: StyleToken | Mixin) {
    const sortedActiveVariantedValues = this.sortedActiveVariantedStyles(style);
    return sortedActiveVariantedValues.length > 0
      ? last(sortedActiveVariantedValues)
      : undefined;
  }

  getVariantedValueWithHighestPriority(token: StyleToken) {
    return this.getVariantedStyleWithHighestPriority(token) as
      | VariantedValue
      | undefined;
  }

  getVariantedRuleSetWithHighestPriority(mixin: Mixin) {
    return this.getVariantedStyleWithHighestPriority(mixin) as
      | VariantedRuleSet
      | undefined;
  }

  isStyleInherited(style: StyleToken | Mixin) {
    return !arrayEqIgnoreOrder(
      this.getVariantedStyleWithHighestPriority(style)?.variants ?? [],
      this.activeGlobalVariants ?? []
    );
  }

  getActiveTokenValue(token: StyleToken): TokenValue {
    return (this.getVariantedValueWithHighestPriority(token)?.value ??
      token.value) as TokenValue;
  }

  updateToken(token: StyleToken, value: string) {
    const variantedValue = token.variantedValues.find((v) =>
      arrayEqIgnoreOrder(v.variants, ensureArray(this.targetGlobalVariants))
    );
    if (this.isTargetBaseVariant()) {
      token.value = value;
    } else if (variantedValue) {
      variantedValue.value = value;
    } else {
      token.variantedValues.push(
        new VariantedValue({
          variants: ensure(
            this.targetGlobalVariants,
            "target global variants must be specified"
          ),
          value,
        })
      );
    }
  }

  removeVariantedValue(token: StyleToken) {
    const variantedValue = token.variantedValues.find((v) =>
      arrayEqIgnoreOrder(v.variants, ensureArray(this.targetGlobalVariants))
    );
    if (variantedValue) {
      remove(token.variantedValues, variantedValue);
    }
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
