import { FullRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import { SpacingControl } from "@/wab/client/components/style-controls/SpacingControl";
import {
  ExpsProvider,
  StylePanelSection,
  TplExpsProvider,
} from "@/wab/client/components/style-controls/StyleComponent";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { PublicStyleSection } from "@/wab/shared/ApiSchema";
import { isCodeComponent } from "@/wab/shared/core/components";
import {
  isComponentRoot,
  isTplColumn,
  isTplComponent,
  isTplSlot,
  isTplTag,
} from "@/wab/shared/core/tpls";
import { TplComponent, TplTag } from "@/wab/shared/model/classes";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import * as React from "react";

export const spacingStyleProps = [
  "padding-left",
  "padding-right",
  "padding-top",
  "padding-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "margin-bottom",
];

export function SpacingSection({
  expsProvider,
  vsh,
}: {
  expsProvider: ExpsProvider;
  vsh?: VariantedStylesHelper;
}) {
  const tpl =
    expsProvider instanceof TplExpsProvider ? expsProvider.tpl : undefined;
  const viewCtx =
    expsProvider instanceof TplExpsProvider ? expsProvider.viewCtx : undefined;

  if (tpl && (isTplSlot(tpl) || (!isTplTag(tpl) && !isTplComponent(tpl)))) {
    return null;
  }

  const showPaddingControls = shouldShowPadding(viewCtx, tpl);
  const showMarginControls = shouldShowMargin(tpl);

  return (
    <StylePanelSection
      title="Spacing"
      styleProps={spacingStyleProps}
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

function shouldShowPadding(
  viewCtx: ViewCtx | undefined,
  tpl: TplTag | TplComponent | undefined
) {
  if (!tpl || !viewCtx) {
    return true;
  }
  if (isTplComponent(tpl)) {
    if (isCodeComponent(tpl.component)) {
      const enabledSections = viewCtx.getCodeComponentMeta(tpl.component)
        ?.styleSections as PublicStyleSection[] | undefined | boolean;
      // By default, padding is enabled for code components, unless the
      // registration excludes it explicitly from styleSections
      if (
        Array.isArray(enabledSections) &&
        !enabledSections.includes(PublicStyleSection.Spacing)
      ) {
        return false;
      }
      return true;
    } else {
      return false;
    }
  } else {
    return !["img", "svg"].includes(tpl.tag);
  }
}

function shouldShowMargin(tpl: TplTag | TplComponent | undefined) {
  // Margin is for positioning, so it's always shown if styling is allowed
  return !tpl || (!isComponentRoot(tpl) && !isTplColumn(tpl));
}
