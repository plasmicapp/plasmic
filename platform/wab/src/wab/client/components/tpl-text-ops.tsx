import { MenuItemContent } from "@/wab/client/components/menu-builder";
import { makeDataTokensSubMenu } from "@/wab/client/components/sidebar-tabs/DataBinding/data-tokens-context-menu";
import { shouldBeDisabled } from "@/wab/client/components/sidebar/sidebar-helpers";
import { getComboForAction } from "@/wab/client/shortcuts/studio/studio-shortcuts";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { DataTokenRef, generateDataTokenName } from "@/wab/commons/DataToken";
import { isBaseVariant, tryGetVariantSetting } from "@/wab/shared/Variants";
import {
  clearText,
  convertTextToDynamic,
  mkDataTokenExprText,
  removeTextOverride,
} from "@/wab/shared/core/tpls";
import {
  DefinedIndicatorType,
  computeDefinedIndicator,
} from "@/wab/shared/defined-indicator";
import { EffectiveVariantSetting } from "@/wab/shared/effective-variant-setting";
import {
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
    /** Create a data token for the text. */
    createDataToken?: () => void;
    /** Bind the text directly to an existing data token. */
    bindDataToken?: (dataTokenRef: DataTokenRef) => void;
    clearText?: () => void;
    /** Only on non-base variants. */
    removeTextOverride?: () => void;
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
    effectiveVs.getTextSource(viewCtx),
    targetVariants,
  );
  const { isDisabled, disabledTooltip } = shouldBeDisabled({
    props: {},
    label: "text",
    indicators: [indicator],
  });

  let actions: TplTextOps["actions"] = {};
  if (!isDisabled && targetVs) {
    const canUseDataTokens = isKnownRawText(targetVsText);
    actions = {
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
                targetVs.text = convertTextToDynamic(targetVs.text, tpl.parent);
                viewCtx.setTriggerEditingTextDataPicker(true);
              });
            }
          : undefined,

      createDataToken: canUseDataTokens
        ? () => {
            viewCtx.change(() => {
              const token = viewCtx.tplMgr().addDataToken({
                name: tpl.name ? generateDataTokenName(tpl.name) : "Text",
                value: JSON.stringify(targetVsText.text),
              });
              viewCtx.setTriggerCreatingTextDataToken(token);
            });
          }
        : undefined,

      bindDataToken: canUseDataTokens
        ? ({ token, projectId }) => {
            viewCtx.change(() => {
              targetVs.text = mkDataTokenExprText(projectId, token.name);
            });
          }
        : undefined,

      clearText:
        isKnownRawText(targetVsText) &&
        targetVsText.text === "" &&
        targetVsText.markers.length === 0
          ? undefined
          : () => {
              viewCtx.change(() => {
                clearText(tpl, targetVs);
              });
            },

      removeTextOverride:
        targetVsText && !isBaseVariant(targetVariants)
          ? () => {
              viewCtx.change(() => {
                removeTextOverride(tpl, targetVs);
              });
            }
          : undefined,
    };
  }

  return {
    effectiveVs,
    targetVs,
    indicator,
    isDisabled: isDisabled ?? false,
    disabledTooltip,
    actions,
  };
}

export function makeTplTextMenu(ops: TplTextOps, viewCtx: ViewCtx) {
  const menuItems: React.ReactNode[] = [];

  if (ops.actions.edit) {
    menuItems.push(
      <Menu.Item key="edit-text" onClick={ops.actions.edit}>
        <MenuItemContent shortcut={getComboForAction("NAV_CHILD")}>
          Edit text
        </MenuItemContent>
      </Menu.Item>,
    );
  }
  const { bindDataToken, createDataToken } = ops.actions;
  if (bindDataToken && createDataToken) {
    const dataTokensSubMenu = makeDataTokensSubMenu({
      site: viewCtx.site,
      projectId: viewCtx.siteInfo.id,
      onSelect: bindDataToken,
      onCreate: createDataToken,
    });
    if (dataTokensSubMenu) {
      menuItems.push(dataTokensSubMenu);
    }
  }
  if (ops.actions.convertToDynamicValue) {
    menuItems.push(
      <Menu.Item
        key="use-dynamic-value"
        onClick={ops.actions.convertToDynamicValue}
      >
        Use dynamic value
      </Menu.Item>,
    );
  }
  if (ops.actions.removeTextOverride) {
    menuItems.push(
      <Menu.Item
        key="remove-text-override"
        onClick={ops.actions.removeTextOverride}
      >
        Remove text override
      </Menu.Item>,
    );
  }
  if (ops.actions.clearText) {
    menuItems.push(
      <Menu.Item key="clear-text" onClick={ops.actions.clearText}>
        Clear text
      </Menu.Item>,
    );
  }
  return menuItems;
}
