import ContextMenu from "@/wab/client/components/ContextMenu";
import S from "@/wab/client/components/canvas/HoverBox/Controls/ImageCanvasControls.module.scss";
import { makeImageMenu } from "@/wab/client/components/sidebar-tabs/image-section";
import { IconLinkButton } from "@/wab/client/components/widgets";
import { Icon } from "@/wab/client/components/widgets/Icon";
import GearIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Gear";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { $$$ } from "@/wab/shared/TplQuery";
import { computeDefinedIndicator } from "@/wab/shared/defined-indicator";
import { isKnownVarRef } from "@/wab/shared/model/classes";
import { TplImageTag } from "@/wab/shared/core/tpls";
import { observer } from "mobx-react";
import React from "react";

export const ImageCanvasControls = observer(
  function ImageCanvasControls(props: { viewCtx: ViewCtx; tpl: TplImageTag }) {
    const { viewCtx, tpl } = props;
    const { studioCtx } = viewCtx;
    const vtm = viewCtx.variantTplMgr();
    const ownerComponent = $$$(tpl).owningComponent();
    const baseVs = vtm.ensureBaseVariantSetting(tpl);
    const targetVs = vtm.ensureCurrentVariantSetting(tpl);
    const effectiveVs = vtm.effectiveVariantSetting(tpl);
    // dealing only with images
    const attr = "src";
    const expr = effectiveVs.attrs[attr];
    const attrSource = effectiveVs.getAttrSource(attr);
    const definedIndicator = computeDefinedIndicator(
      viewCtx.site,
      viewCtx.currentComponent(),
      attrSource,
      vtm.getTargetIndicatorComboForNode(tpl)
    );

    const variable = expr && isKnownVarRef(expr) ? expr.variable : undefined;

    const [event, setEvent] = React.useState<MouseEvent | undefined>(undefined);

    if (tpl.tag === "svg") {
      return null;
    }

    const rawMenu = makeImageMenu({
      tpl,
      isIcon: false,
      variable,
      baseVs,
      targetVs,
      attr,
      ownerComponent,
      viewCtx,
      definedIndicator,
      expr,
      fallback: undefined,
    });

    const menu = React.cloneElement(rawMenu, {
      onClick: (param) => {
        if (rawMenu.props.onClick) {
          rawMenu.props.onClick(param);
        }
        setEvent(undefined);
      },
    });

    return (
      <>
        <IconLinkButton
          className={S.imgControl}
          onClick={(e) => setEvent(e.nativeEvent)}
        >
          <Icon icon={GearIcon} />
        </IconLinkButton>
        {event && (
          <ContextMenu
            pageX={event.pageX}
            pageY={event.pageY}
            overlay={menu}
            onHide={() => setEvent(undefined)}
          />
        )}
      </>
    );
  }
);
