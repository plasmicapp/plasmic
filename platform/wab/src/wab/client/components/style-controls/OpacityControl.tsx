import { LabeledStyleDimItem } from "@/wab/client/components/sidebar/sidebar-helpers";
import {
  ExpsProvider,
  useStyleComponent,
} from "@/wab/client/components/style-controls/StyleComponent";
import { makeVariantedStylesHelperFromCurrentCtx } from "@/wab/client/utils/style-utils";
import { isTokenRef } from "@/wab/commons/StyleToken";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { observer } from "mobx-react";
import React from "react";

interface OpacityControlProps {
  expsProvider: ExpsProvider;
  vsh?: VariantedStylesHelper;
}

export const OpacityControl = observer(function OpacityControl(
  props: OpacityControlProps
) {
  const { expsProvider } = props;
  const styling = useStyleComponent();

  // Use provided vsh or create one from studio context
  const vsh =
    props.vsh ??
    makeVariantedStylesHelperFromCurrentCtx(expsProvider.studioCtx);

  // Get current opacity value
  const opacity = expsProvider.mergedExp().get("opacity") || "1";
  const formattedOpacity = isTokenRef(opacity)
    ? opacity
    : `${Math.round(parseFloat(opacity) * 100)}%`;

  const opacityDefinedIndicator = expsProvider.definedIndicator("opacity");

  const handleOpacityChange = (val?: string) => {
    const newVal = val?.includes("%")
      ? parseInt(val) / 100
      : parseFloat(val || "1");

    styling.change(() => {
      if (val === undefined || (isNaN(newVal) && !isTokenRef(val))) {
        styling.exp().clear("opacity");
      } else {
        styling
          .exp()
          .set("opacity", val && isTokenRef(val) ? val : String(newVal));
      }
    });
  };

  return (
    <LabeledStyleDimItem
      styleName="opacity"
      definedIndicator={opacityDefinedIndicator}
      aria-label="Opacity"
      dimOpts={{
        value: formattedOpacity,
        onChange: handleOpacityChange,
        min: 0,
        max: 100,
        extraOptions: ["100%", "75%", "50%", "25%", "0%"],
        allowedUnits: ["%"],
        tooltip: "Opacity",
      }}
      tokenType={"Opacity"}
      vsh={vsh}
    />
  );
});
