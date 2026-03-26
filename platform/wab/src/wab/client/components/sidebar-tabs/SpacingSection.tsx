import { FullRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import { SpacingControl } from "@/wab/client/components/style-controls/SpacingControl";
import {
  ExpsProvider,
  StylePanelSection,
  TplExpsProvider,
} from "@/wab/client/components/style-controls/StyleComponent";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import {
  isMarginValidForTpl,
  isPaddingValidForTpl,
} from "@/wab/shared/core/style-props-tpl";
import { isTplComponent, isTplSlot, isTplTag } from "@/wab/shared/core/tpls";
import * as React from "react";

import { spacingSectionProps } from "@/wab/shared/core/style-props";

export function SpacingSection({
  expsProvider,
  vsh,
}: {
  expsProvider: ExpsProvider;
  vsh?: VariantedStylesHelper;
}) {
  let showPaddingControls: boolean;
  let showMarginControls: boolean;
  if (expsProvider instanceof TplExpsProvider) {
    // If editing tpl, check if allowed.
    const tpl = expsProvider.tpl;
    const viewCtx = expsProvider.viewCtx;

    if (isTplSlot(tpl) || (!isTplTag(tpl) && !isTplComponent(tpl))) {
      return null;
    }

    showPaddingControls = isPaddingValidForTpl(
      tpl,
      viewCtx.studioCtx.codeComponentsRegistry
    );
    showMarginControls = isMarginValidForTpl(tpl);
  } else {
    // If editing theme/mixin, always show.
    showPaddingControls = true;
    showMarginControls = true;
  }

  return (
    <StylePanelSection
      title="Spacing"
      styleProps={spacingSectionProps}
      expsProvider={expsProvider}
      key={`${showPaddingControls} ${showMarginControls}`}
    >
      {showPaddingControls && (
        <FullRow>
          <SpacingControl
            spacingStyleProp={"padding"}
            popoverPlacement={"left"}
            expsProvider={expsProvider}
            label="Padding"
            subtitle="(inner)"
            vsh={vsh}
          />
        </FullRow>
      )}
      {showMarginControls && (
        <FullRow>
          <SpacingControl
            allowAuto
            spacingStyleProp={"margin"}
            popoverPlacement={"left"}
            expsProvider={expsProvider}
            label="Margin"
            subtitle="(outer)"
            vsh={vsh}
          />
        </FullRow>
      )}
    </StylePanelSection>
  );
}
