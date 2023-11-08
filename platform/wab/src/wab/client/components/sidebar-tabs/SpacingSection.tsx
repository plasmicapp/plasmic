import * as React from "react";
import { PublicStyleSection } from "src/wab/shared/ApiSchema";
import { TplComponent, TplTag } from "../../../classes";
import { isCodeComponent } from "../../../components";
import { VariantedStylesHelper } from "../../../shared/VariantedStylesHelper";
import {
  isComponentRoot,
  isTplColumn,
  isTplComponent,
  isTplSlot,
  isTplTag,
} from "../../../tpls";
import { ViewCtx } from "../../studio-ctx/view-ctx";
import { FullRow } from "../sidebar/sidebar-helpers";
import { SpacingControl } from "../style-controls/SpacingControl";
import {
  ExpsProvider,
  StylePanelSection,
  TplExpsProvider,
} from "../style-controls/StyleComponent";

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
      styleProps={[
        "padding-left",
        "padding-right",
        "padding-top",
        "padding-bottom",
        "margin-left",
        "margin-right",
        "margin-top",
        "margin-bottom",
      ]}
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
