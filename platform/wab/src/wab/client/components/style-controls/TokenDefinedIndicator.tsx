import {
  getStylePropValue,
  SourceRow,
  variantComboName,
} from "@/wab/client/components/style-controls/DefinedIndicator";
import styles from "@/wab/client/components/style-controls/DefinedIndicator.module.sass";
import { useClientTokenResolver } from "@/wab/client/components/widgets/ColorPicker/client-token-resolver";
import { Icon } from "@/wab/client/components/widgets/Icon";
import TokenIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Token";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { notNil } from "@/wab/shared/common";
import { FinalToken, MutableToken } from "@/wab/shared/core/tokens";
import {
  isKnownVariantedValue,
  StyleToken,
  VariantedValue,
} from "@/wab/shared/model/classes";
import { capitalizeFirst } from "@/wab/shared/strs";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { BASE_VARIANT_NAME } from "@/wab/shared/Variants";
import { Popover } from "antd";
import classNames from "classnames";
import React from "react";

export function TokenDefinedIndicator(props: {
  token: FinalToken<StyleToken>;
  vsh?: VariantedStylesHelper;
  studioCtx: StudioCtx;
  className?: string;
}) {
  const {
    token,
    vsh = new VariantedStylesHelper(),
    studioCtx,
    className,
  } = props;
  const clientTokenResolver = useClientTokenResolver();

  // Base variant:
  //   OverrideableToken
  //
  // Non-base variant:
  //   MutableToken with varianted value -> "overriding"
  //   MutableToken without varianted value -> "inherited"
  //   OverrideableToken with varianted override -> "overriding"
  //
  // Otherwise: no indicator
  const indicatorType = (() => {
    if (vsh.isTargetBaseVariant()) {
      if (token instanceof MutableToken) {
        return undefined;
      } else {
        if (notNil(token.override?.value)) {
          return "set";
        } else {
          return "inherited";
        }
      }
    } else {
      // if targeting variant
      const variantedValue = vsh.getVariantedValueWithHighestPriority(token);

      if (token instanceof MutableToken) {
        return variantedValue ? "overriding" : "inherited";
      } else {
        if (
          token.override &&
          variantedValue &&
          token.override.variantedValues.includes(variantedValue)
        ) {
          return "overriding";
        } else {
          return "inherited";
        }
      }
    }
  })();
  const isEditingNonBaseVariant = !vsh.isTargetBaseVariant();

  const valueInheritanceChain: (VariantedValue | { value: string })[] = [];

  if (vsh.isTargetBaseVariant()) {
    // The original base value
    valueInheritanceChain.push({ value: token.base.value });
    if (notNil(token.override?.value)) {
      // the overridden basevalue
      valueInheritanceChain.push({ value: token.override.value });
    }
  } else {
    // overridden base value if available, otherwise the base value
    valueInheritanceChain.push({ value: token.value });
  }

  // all varianted values for the targeted variant
  valueInheritanceChain.push(...vsh.sortedActiveVariantedValue(token));

  return (
    <div className={className}>
      <Popover
        title={token.name}
        content={valueInheritanceChain.map((v, i, arr) => (
          <div className="defined-indicator__prop" key={i}>
            <div className="defined-indicator__source-stack">
              <div className="defined-indicator__source-stack__line-container">
                <div className="defined-indicator__source-stack__line-container__line" />
              </div>
              <SourceRow
                key={i}
                title={
                  isKnownVariantedValue(v)
                    ? variantComboName(v.variants)
                    : capitalizeFirst(BASE_VARIANT_NAME)
                }
                icon={<Icon icon={TokenIcon} />}
                type={i !== arr.length - 1 ? "overwritten" : "target"}
              >
                <div className="flex flex-vcenter">
                  {getStylePropValue(
                    clientTokenResolver,
                    studioCtx.site,
                    undefined,
                    v.value,
                    vsh
                  )}
                </div>
              </SourceRow>
            </div>
          </div>
        ))}
      >
        <div className={styles.DefinedIndicatorContainerCentered}>
          <div
            className={classNames({
              [styles.DefinedIndicator]: !!indicatorType,
              [styles["DefinedIndicator--set"]]: indicatorType === "set",
              [styles["DefinedIndicator--overriding"]]:
                indicatorType === "overriding" && isEditingNonBaseVariant,
              [styles["DefinedIndicator--inherited"]]:
                indicatorType === "inherited",
            })}
          />
        </div>
      </Popover>
    </div>
  );
}
