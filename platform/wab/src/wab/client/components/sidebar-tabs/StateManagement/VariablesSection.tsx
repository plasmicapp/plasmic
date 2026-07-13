import { COMMANDS } from "@/wab/client/commands/command";
import ImplicitVariablesSection from "@/wab/client/components/sidebar-tabs/StateManagement/ImplicitVariablesSection";
import { VariableEditingModal } from "@/wab/client/components/sidebar-tabs/StateManagement/VariableEditingModal";
import VariableRow from "@/wab/client/components/sidebar-tabs/StateManagement/VariableRow";
import {
  SidebarSection,
  SidebarSectionHandle,
} from "@/wab/client/components/sidebar/SidebarSection";
import { IconLinkButton } from "@/wab/client/components/widgets";
import { StateVariablesTooltip } from "@/wab/client/components/widgets/DetailedTooltips";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { LabelWithDetailedTooltip } from "@/wab/client/components/widgets/LabelWithDetailedTooltip";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { DefaultVariablesSectionProps } from "@/wab/client/plasmic/plasmic_kit_state_management/PlasmicVariablesSection";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { parseUiId } from "@/wab/client/studio-ctx/ui/studio-ui-ids";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { unwrap } from "@/wab/commons/failable-utils";
import { VARIABLE_PLURAL_CAP } from "@/wab/shared/Labels";
import { ensure } from "@/wab/shared/common";
import { Component, State } from "@/wab/shared/model/classes";
import cn from "classnames";
import { groupBy } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { useState } from "react";

export interface VariablesSectionProps extends DefaultVariablesSectionProps {
  component: Component;
  viewCtx: ViewCtx;
}

function VariablesSection_(props: VariablesSectionProps) {
  const studioCtx = useStudioCtx();
  const { component, viewCtx } = props;

  const [newVariable, setNewVariable] = useState<State | null>(null);
  const [isExpanded, setExpanded] = useState(false);
  const sectionRef = React.useRef<SidebarSectionHandle>(null);

  const implicitVariableGroups = Object.values(
    groupBy(
      component.states.filter((state) => state.tplNode),
      (state) => state.tplNode?.name
    )
  );

  // Implicit states may be collapsed, so listen for UI actions
  // and expand their section if an action is dispatched.
  React.useEffect(() => {
    const { dispose } = studioCtx.uiActionBus.registerListener(
      (uiId, _type) => {
        const parsed = parseUiId(uiId);
        if (parsed.type === "Model" && parsed.typeTag === "StateParam") {
          sectionRef.current?.expand();
          setExpanded(true);
        }
      }
    );
    return dispose;
  }, [studioCtx]);

  const regularVariables = component.states.filter(
    (state) =>
      state.variableType !== "variant" &&
      !state.tplNode &&
      state !== newVariable
  );

  return (
    <>
      <SidebarSection
        ref={sectionRef}
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
                onClick={async () => {
                  const newState = unwrap(
                    await COMMANDS.component.addNewStateVariable.execute(
                      studioCtx,
                      {},
                      {
                        component,
                      }
                    )
                  );

                  setNewVariable(newState);
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
        viewCtx={viewCtx}
      />
    </>
  );
}

const VariablesSection = observer(VariablesSection_);
export default VariablesSection;
