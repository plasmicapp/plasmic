import ImplicitVariablesSection from "@/wab/client/components/sidebar-tabs/StateManagement/ImplicitVariablesSection";
import { VariableEditingModal } from "@/wab/client/components/sidebar-tabs/StateManagement/VariableEditingModal";
import VariableRow from "@/wab/client/components/sidebar-tabs/StateManagement/VariableRow";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import { IconLinkButton } from "@/wab/client/components/widgets";
import { StateVariablesTooltip } from "@/wab/client/components/widgets/DetailedTooltips";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { LabelWithDetailedTooltip } from "@/wab/client/components/widgets/LabelWithDetailedTooltip";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { DefaultVariablesSectionProps } from "@/wab/client/plasmic/plasmic_kit_state_management/PlasmicVariablesSection";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { ensure, spawn } from "@/wab/shared/common";
import { mkParamsForState } from "@/wab/shared/core/lang";
import { VARIABLE_PLURAL_CAP } from "@/wab/shared/Labels";
import { Component, State } from "@/wab/shared/model/classes";
import {
  DEFAULT_STATE_ACCESS_TYPE,
  DEFAULT_STATE_VARIABLE_NAME,
  DEFAULT_STATE_VARIABLE_TYPE,
  addComponentState,
  genOnChangeParamName,
  getDefaultValueForStateVariableType,
  mkState,
} from "@/wab/shared/core/states";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import cn from "classnames";
import { groupBy } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { useState } from "react";
import { codeLit } from "@/wab/shared/core/exprs";

export function mkInitialState(sc: StudioCtx, component: Component) {
  const name = sc
    .tplMgr()
    .getUniqueParamName(component, DEFAULT_STATE_VARIABLE_NAME);

  const onChangeProp = sc
    .tplMgr()
    .getUniqueParamName(component, genOnChangeParamName(name));

  const { valueParam, onChangeParam } = mkParamsForState({
    name,
    onChangeProp,
    variableType: DEFAULT_STATE_VARIABLE_TYPE,
    accessType: DEFAULT_STATE_ACCESS_TYPE,
    defaultExpr: codeLit(
      getDefaultValueForStateVariableType(DEFAULT_STATE_VARIABLE_TYPE)
    ),
  });

  return mkState({
    param: valueParam,
    onChangeParam,
    variableType: DEFAULT_STATE_VARIABLE_TYPE,
    accessType: DEFAULT_STATE_ACCESS_TYPE,
  });
}

export interface VariablesSectionProps extends DefaultVariablesSectionProps {
  component: Component;
  viewCtx: ViewCtx;
}

function VariablesSection_(
  props: VariablesSectionProps,
  ref: HTMLElementRefOf<"div">
) {
  const studioCtx = useStudioCtx();
  const { component, viewCtx } = props;

  const [newVariable, setNewVariable] = useState<State | null>(null);
  const [isExpanded, setExpanded] = useState(false);

  const implicitVariableGroups = Object.values(
    groupBy(
      component.states.filter((state) => state.tplNode),
      (state) => state.tplNode?.name
    )
  );

  const regularVariables = component.states.filter(
    (state) =>
      state.variableType !== "variant" &&
      !state.tplNode &&
      state !== newVariable
  );

  return (
    <>
      <SidebarSection
        title={
          <LabelWithDetailedTooltip tooltip={StateVariablesTooltip}>
            {VARIABLE_PLURAL_CAP}
          </LabelWithDetailedTooltip>
        }
        controls={
          <>
            <IconLinkButton>
              <Icon
                icon={PlusIcon}
                onClick={() => {
                  spawn(
                    studioCtx.change(({ success }) => {
                      const newState = mkInitialState(studioCtx, component);
                      addComponentState(studioCtx.site, component, newState);
                      setNewVariable(newState);
                      return success();
                    })
                  );
                }}
                data-test-id="add-state-btn"
              />
            </IconLinkButton>
          </>
        }
        defaultExtraContentExpanded={isExpanded}
        onExtraContentCollapsed={() => setExpanded(false)}
        onExtraContentExpanded={() => setExpanded(true)}
        zeroBodyPadding
        fullyCollapsible={!regularVariables.length}
        emptyBody={
          component.states.filter((state) => state.variableType !== "variant")
            .length === 0
        }
        noBottomPadding={!!implicitVariableGroups.length}
        data-test-id="variables-section"
      >
        {(renderMaybeCollapsibleRows) => {
          return (
            <>
              {!!regularVariables.length && (
                <div
                  className={cn({
                    "pb-m": !isExpanded && implicitVariableGroups.length,
                  })}
                  data-test-id="variable-container"
                >
                  {regularVariables.map((state) => (
                    <VariableRow
                      key={state.uid}
                      state={state}
                      sc={studioCtx}
                      viewCtx={viewCtx}
                      component={component}
                    />
                  ))}
                </div>
              )}
              {!!implicitVariableGroups.length &&
                renderMaybeCollapsibleRows([
                  {
                    content: (
                      <div
                        className="pb-m"
                        data-test-id="implicit-variable-container"
                      >
                        {implicitVariableGroups.map((states) => (
                          <ImplicitVariablesSection
                            component={component}
                            tpl={ensure(
                              states[0].tplNode,
                              "implicit state should have a tpl"
                            )}
                            sc={studioCtx}
                            viewCtx={viewCtx}
                          />
                        ))}
                      </div>
                    ),
                    collapsible: true,
                  },
                ])}
            </>
          );
        }}
      </SidebarSection>
      <VariableEditingModal
        show={!!newVariable}
        mode="new"
        studioCtx={studioCtx}
        state={newVariable}
        onClose={() => setNewVariable(null)}
        component={component}
      />
    </>
  );
}

const VariablesSection = observer(React.forwardRef(VariablesSection_));
export default VariablesSection;
