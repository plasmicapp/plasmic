import { MenuItemContent } from "@/wab/client/components/menu-builder";
import { shouldBeDisabled } from "@/wab/client/components/sidebar/sidebar-helpers";
import { getComboForAction } from "@/wab/client/shortcuts/studio/studio-shortcuts";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { isBaseVariant, tryGetVariantSetting } from "@/wab/shared/Variants";
import { convertTextToDynamic, fixTextChildren } from "@/wab/shared/core/tpls";
import {
  DefinedIndicatorType,
  computeDefinedIndicator,
} from "@/wab/shared/defined-indicator";
import { EffectiveVariantSetting } from "@/wab/shared/effective-variant-setting";
import {
  RawText,
  TplTag,
  VariantSetting,
  isKnownRawText,
} from "@/wab/shared/model/classes";
import { Menu } from "antd";
import React from "react";

export interface TplTextOps {
  effectiveVs: EffectiveVariantSetting;
  targetVs: VariantSetting | undefined;
  indicator: DefinedIndicatorType;
  isDisabled: boolean;
  disabledTooltip: React.ReactNode | (() => React.ReactNode);
  actions: {
    /** Show the text editor. */
    edit?: () => void;
    /** Converts the RawText to an ExprText. */
    convertToDynamicValue?: () => void;
    /** Set to empty RawText. */
    clear?: () => void;
    /** Set to undefined, on non-base variants only. */
    removeVariantSetting?: () => void;
  };
}

export function makeTplTextOps(viewCtx: ViewCtx, tpl: TplTag): TplTextOps {
  const vtm = viewCtx.variantTplMgr();
  const effectiveVs = vtm.effectiveVariantSetting(tpl);
  const targetVariants = vtm.getTargetVariantComboForNode(tpl);
  const targetVs = tryGetVariantSetting(tpl, targetVariants);
  const targetVsText = targetVs?.text;

  const indicator = computeDefinedIndicator(
    viewCtx.site,
    viewCtx.currentComponent(),
    effectiveVs.getTextSource(),
    targetVariants
  );
  const { isDisabled, disabledTooltip } = shouldBeDisabled({
    props: {},
    label: "text",
    indicators: [indicator],
  });

  return {
    effectiveVs,
    targetVs,
    indicator,
    isDisabled: isDisabled ?? false,
    disabledTooltip,
    actions:
      isDisabled || !targetVs
        ? {}
        : {
            edit: () => {
              viewCtx.change(() => {
                const sel = viewCtx.maybeTpl2ValsInContext(tpl);
                viewCtx.getViewOps().tryEditText({ focusObj: sel[0] });
              });
            },

            convertToDynamicValue:
              !targetVsText || isKnownRawText(targetVsText)
                ? () => {
                    viewCtx.change(() => {
                      targetVs.text = convertTextToDynamic(targetVs.text);
                      viewCtx.setTriggerEditingTextDataPicker(true);
                    });
                  }
                : undefined,

            clear:
              isKnownRawText(targetVsText) &&
              targetVsText.text === "" &&
              targetVsText.markers.length === 0
                ? undefined
                : () => {
                    viewCtx.change(() => {
                      if (isKnownRawText(targetVsText)) {
                        targetVsText.text = "";
                        targetVsText.markers = [];
                        fixTextChildren(tpl);
                      } else {
                        targetVs.text = new RawText({ text: "", markers: [] });
                      }
                    });
                  },

            removeVariantSetting:
              targetVsText && !isBaseVariant(targetVariants)
                ? () => {
                    viewCtx.change(() => {
                      targetVs.text = undefined;
                    });
                  }
                : undefined,
          },
  };
}

export function makeTplTextMenu(ops: TplTextOps) {
  const menuItems: React.ReactNode[] = [];
  if (ops.actions.edit) {
    menuItems.push(
      <Menu.Item key="edit-text" onClick={ops.actions.edit}>
        <MenuItemContent shortcut={getComboForAction("NAV_CHILD")}>
          Edit text
        </MenuItemContent>
      </Menu.Item>
    );
  }
  if (ops.actions.convertToDynamicValue) {
    menuItems.push(
      <Menu.Item
        key="use-dynamic-value"
        onClick={ops.actions.convertToDynamicValue}
      >
        Use dynamic value
      </Menu.Item>
    );
  }
  if (ops.actions.removeVariantSetting) {
    menuItems.push(
      <Menu.Item
        key="remove-text-override"
        onClick={ops.actions.removeVariantSetting}
      >
        Remove text override
      </Menu.Item>
    );
  }
  if (ops.actions.clear) {
    menuItems.push(
      <Menu.Item key="clear-text" onClick={ops.actions.clear}>
        Clear text
      </Menu.Item>
    );
  }
  return menuItems;
}
