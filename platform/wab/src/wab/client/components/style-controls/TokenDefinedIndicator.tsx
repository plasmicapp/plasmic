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
import { FinalToken, OverrideableToken } from "@/wab/shared/core/tokens";
import { isKnownVariantedValue, StyleToken } from "@/wab/shared/model/classes";
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

  const indicatorType = (() => {
    if (vsh.isStyleInherited(token)) {
      return "otherVariants";
    }
    if (!vsh.isTargetBaseVariant()) {
      return "overriding";
    }
    if (token instanceof OverrideableToken) {
      if (token.override?.value) {
        return "set";
      }
      return "otherVariants";
    }
    return undefined;
  })();
  const isEditingNonBaseVariant = !vsh.isTargetBaseVariant();

  return (
    <div className={className}>
      <Popover
        title={token.name}
        content={[
          {
            isBaseVariant: "true",
            value: token.value,
          },
          ...vsh.sortedActiveVariantedValue(token),
        ].map((v, i, arr) => (
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
                indicatorType === "otherVariants",
            })}
          />
        </div>
      </Popover>
    </div>
  );
}
