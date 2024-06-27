import { FullRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import StyleToggleButton from "@/wab/client/components/style-controls/StyleToggleButton";
import StyleToggleButtonGroup from "@/wab/client/components/style-controls/StyleToggleButtonGroup";
import { alignItemsIcons } from "@/wab/client/components/style-controls/align-items-controls";
import { JustifyContentIcons } from "@/wab/client/components/style-controls/justify-content-controls";
import { Icon } from "@/wab/client/components/widgets/Icon";
import InfoIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Info";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { RSH } from "@/wab/shared/RuleSetHelpers";
import { TplNode } from "@/wab/shared/model/classes";
import { TplColumnsTag } from "@/wab/shared/core/tpls";
import { Popover } from "antd";
import { observer } from "mobx-react";
import React from "react";

export interface ColumnsAlignProps {
  viewCtx: ViewCtx;
  tpl: TplColumnsTag;
  isDisabled?: boolean;
}

export const ColumnsAlignControls = observer(function ColumnsAlignControls(
  props: ColumnsAlignProps
) {
  const { tpl, viewCtx, isDisabled } = props;
  const studioCtx = viewCtx.studioCtx;
  const alignItemsOptions = [
    "flex-start",
    "center",
    "flex-end",
    "stretch",
    "baseline",
  ];
  const justifyContentOptions = [
    "flex-start",
    "center",
    "flex-end",
    "space-between",
    "space-evenly",
  ];
  const columnDir = "column";
  const getAllColumnsProp = (prop: string) => {
    const childrenExp = tpl.children.map((node) =>
      RSH(
        viewCtx.effectiveCurrentVariantSetting(node as TplNode).rs,
        node as TplNode
      )
    );
    if (childrenExp.length === 0) {
      return "";
    }
    const firstValue = childrenExp[0].get(prop);
    if (childrenExp.every((exp) => firstValue === exp.get(prop))) {
      return firstValue;
    }
    return "";
  };

  const setAllColumnsProp = (prop: string, value: string | undefined) => {
    if (tpl.children.length > 0) {
      tpl.children.forEach((node) => {
        const exp = viewCtx.variantTplMgr().targetRshForNode(node as TplNode);
        if (value) {
          exp.set(prop, value);
        } else {
          exp.clear(prop);
        }
      });
    }
  };

  const isBreakpointFlexReverse = () => {
    const flexDir = RSH(
      viewCtx.effectiveCurrentVariantSetting(tpl).rs,
      tpl
    ).get("flex-direction");
    return flexDir.endsWith("-reverse");
  };

  const createToolip = (content: string) => {
    return (
      <Popover content={content} placement="rightTop">
        <Icon icon={InfoIcon} className="ml-ch dimdimfg" />
      </Popover>
    );
  };
  const EachColumnTooltip = () => {
    return createToolip("The layout styles are applied to each column");
  };

  return (
    <>
      <FullRow autoHeight className="mb-lg">
        <div className="flex-fill">
          Layout items <EachColumnTooltip />
        </div>
      </FullRow>
      <FullRow>
        <StyleToggleButtonGroup
          isDisabled={isDisabled}
          onChange={(val) =>
            val &&
            studioCtx.changeUnsafe(() =>
              setAllColumnsProp("justify-content", val)
            )
          }
          value={getAllColumnsProp("justify-content") || undefined}
        >
          {justifyContentOptions.map((option) => (
            <StyleToggleButton
              className="flex-fill"
              value={option}
              key={option}
            >
              <Icon icon={JustifyContentIcons[columnDir][option]} />
            </StyleToggleButton>
          ))}
        </StyleToggleButtonGroup>
      </FullRow>
      <FullRow>
        <StyleToggleButtonGroup
          isDisabled={isDisabled}
          onChange={(val) =>
            val &&
            studioCtx.changeUnsafe(() => setAllColumnsProp("align-items", val))
          }
          value={getAllColumnsProp("align-items") || undefined}
        >
          {alignItemsOptions.map((option) => (
            <StyleToggleButton
              className="flex-fill"
              value={option}
              key={option}
            >
              <Icon icon={alignItemsIcons[columnDir][option]} />
            </StyleToggleButton>
          ))}
        </StyleToggleButtonGroup>
      </FullRow>
    </>
  );
});
