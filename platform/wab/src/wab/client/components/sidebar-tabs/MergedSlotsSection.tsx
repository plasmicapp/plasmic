import {
  ComponentPropsSection,
  getComponentPropTypes,
} from "@/wab/client/components/sidebar-tabs/ComponentPropsSection";
import {
  TextOnlySection,
  TypographySection,
} from "@/wab/client/components/sidebar-tabs/TypographySection";
import {
  TplExpsProvider,
  mkStyleComponent,
  providesStyleComponent,
} from "@/wab/client/components/style-controls/StyleComponent";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { hackyCast } from "@/wab/shared/common";
import { getComponentDisplayName } from "@/wab/shared/core/components";
import {
  getAncestorTplSlot,
  getSingleTextBlockFromArg,
  getSingleTplComponentFromArg,
  getSlotParams,
} from "@/wab/shared/SlotUtils";
import { $$$ } from "@/wab/shared/TplQuery";
import { isPlainObjectPropType } from "@/wab/shared/code-components/code-components";
import { getContextDependentValue } from "@/wab/shared/context-dependent-value";
import { TplComponent } from "@/wab/shared/model/classes";
import { smartHumanize } from "@/wab/shared/strs";
import { observer } from "mobx-react";
import React from "react";

export const MergedSlotsTextSection = observer(
  function MergedSlotsSection(props: {
    tpl: TplComponent;
    viewCtx: ViewCtx;
    tab: "settings" | "style";
  }) {
    const { viewCtx, tpl, tab } = props;

    const slotParams = getSlotParams(tpl.component).filter(
      (p) => p.mergeWithParent
    );

    if (slotParams.length === 0) {
      return null;
    }

    return (
      <>
        {slotParams.map((param) => {
          const arg = $$$(tpl).getSlotArg(param.variable.name);
          const maybeTextTpl = getSingleTextBlockFromArg(arg);
          if (maybeTextTpl) {
            const textExpsProvider = new TplExpsProvider(viewCtx, maybeTextTpl);
            const textStyleAncestorSlot = getAncestorTplSlot(
              maybeTextTpl,
              false
            );
            const childSc = mkStyleComponent({
              expsProvider: textExpsProvider,
            });
            return providesStyleComponent(childSc)(
              tab === "settings" ? (
                <TextOnlySection
                  key={`${tpl.uuid}-component-text-slot-content-only`}
                  expsProvider={textExpsProvider}
                  viewCtx={viewCtx}
                  title={`${smartHumanize(param.variable.name)}: Text`}
                />
              ) : (
                <TypographySection
                  key={`${tpl.uuid}-component-text-slot`}
                  title={`${smartHumanize(param.variable.name)}: Text`}
                  expsProvider={textExpsProvider as TplExpsProvider}
                  ancestorSlot={textStyleAncestorSlot}
                  inheritableOnly={false}
                  viewCtx={viewCtx}
                />
              )
            );
          }
          return null;
        })}
      </>
    );
  }
);

export const MergedSlotsPropsSection = observer(
  function MergedSlotsSection(props: {
    tpl: TplComponent;
    viewCtx: ViewCtx;
    tab: "settings" | "style";
  }) {
    const { viewCtx, tpl, tab } = props;

    const propTypes = getComponentPropTypes(viewCtx, tpl.component);
    const { componentPropValues, ccContextData } =
      viewCtx.getComponentPropValuesAndContextData(tpl);

    const slotParams = getSlotParams(tpl.component).filter((p) => {
      if (!p.mergeWithParent || !(p.variable.name in propTypes)) {
        return false;
      }
      const propType = propTypes[p.variable.name];
      if (isPlainObjectPropType(propType) && "hiddenMergedProps" in propType) {
        return !getContextDependentValue(
          hackyCast(propType).hiddenMergedProps,
          componentPropValues,
          ccContextData,
          { path: [] }
        );
      }
      return true;
    });

    if (slotParams.length === 0) {
      return null;
    }

    return (
      <>
        {slotParams.map((param) => {
          const arg = $$$(tpl).getSlotArg(param.variable.name);
          const maybeTplComponent = getSingleTplComponentFromArg(arg);
          if (maybeTplComponent) {
            const childExpsProvider = new TplExpsProvider(
              viewCtx,
              maybeTplComponent
            );
            const childSc = mkStyleComponent({
              expsProvider: childExpsProvider,
            });
            return providesStyleComponent(childSc)(
              <ComponentPropsSection
                key={`${tpl.uuid}-merged-props`}
                viewCtx={viewCtx}
                tpl={maybeTplComponent}
                customTitle={`${smartHumanize(
                  param.variable.name
                )}: ${getComponentDisplayName(
                  maybeTplComponent.component
                )} Props`}
                expsProvider={childExpsProvider}
                tab={tab}
                includeVariants
              />
            );
          }
          return null;
        })}
      </>
    );
  }
);
