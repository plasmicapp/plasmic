import { COMMANDS } from "@/wab/client/commands/command";
import { MenuBuilder } from "@/wab/client/components/menu-builder";
import {
  PREVIEW_DISABLED_TOOLTIP_MESSAGE,
  VariableValueEditor,
} from "@/wab/client/components/sidebar-tabs/StateManagement/VariableEditingForm";
import { VariableEditingModal } from "@/wab/client/components/sidebar-tabs/StateManagement/VariableEditingModal";
import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { assert, ensure, spawn } from "@/wab/shared/common";
import { canDeleteState } from "@/wab/shared/core/components";
import {
  getStateDisplayName,
  isPrivateState,
  StateVariableType,
} from "@/wab/shared/core/states";
import { VARIABLE_LOWER } from "@/wab/shared/Labels";
import { Component, isKnownTplSlot, State } from "@/wab/shared/model/classes";
import { Menu } from "antd";
import React from "react";

function useVariableMenu({
  showVariableConfigModal,
  showValueModal,
  hasTempValue,
  handleTempValueReset,
  component,
  state,
  onRemove,
}: {
  showVariableConfigModal: (e?: MouseEvent) => void;
  showValueModal: (e?: MouseEvent) => void;
  hasTempValue: boolean;
  handleTempValueReset: () => void;
  component: Component;
  state: State;
  onRemove?: { (e?: MouseEvent): void | undefined };
}) {
  const builder = new MenuBuilder();

  builder.genSection(undefined, (push) => {
    push(
      <Menu.Item key="edit-state" onClick={() => showVariableConfigModal()}>
        Configure {VARIABLE_LOWER}
      </Menu.Item>
    );
    push(
      <Menu.Item key="change-value" onClick={() => showValueModal()}>
        Change preview value
      </Menu.Item>
    );
    push(
      <Menu.Item
        key="reset-value"
        disabled={!hasTempValue}
        onClick={handleTempValueReset}
      >
        Reset preview value
      </Menu.Item>
    );
  });

  builder.genSection(undefined, (push) => {
    if (canDeleteState(component, state)) {
      push(
        <Menu.Item key="remove-state" onClick={() => onRemove?.()}>
          Delete {VARIABLE_LOWER}
        </Menu.Item>
      );
    }
  });

  return builder.build({
    menuName: "state-menu",
  });
}

export function useVariableRow({
  sc: studioCtx,
  component,
  viewCtx,
  state,
}: {
  sc: StudioCtx;
  component: Component;
  state: State;
  viewCtx: ViewCtx;
}): {
  menu: JSX.Element;
  modals: JSX.Element;
  props: {
    hasTempValue?: boolean;
    showValueConfigModal: () => void;
    showVariableConfigModal: () => void;
    onRemove?: () => void;
    name: string;
    value: any;
    isExternal: boolean;
    variableType: StateVariableType;
    menuButton: { menu: JSX.Element };
  };
} {
  const vc = ensure(
    viewCtx || studioCtx.focusedViewCtx(),
    "Must have a focusedViewCtx"
  );

  const [valueModalVisible, setValueModalVisible] =
    React.useState<boolean>(false);
  const [settingsModalVisible, setSettingsModalVisible] =
    React.useState<boolean>(false);

  const initialValue = vc.getStateCurrentInitialValue(state);
  const value = vc.getCanvasStateValue(state);
  const hasTempValue = initialValue !== value;

  assert(
    !isKnownTplSlot(component.tplTree),
    "slots or tpl groups can't be root of a component"
  );
  const onRemove = state.implicitState
    ? undefined
    : (e?: MouseEvent) => {
        e?.stopPropagation();
        spawn(
          COMMANDS.component.removeStateVariable.execute(
            studioCtx,
            {},
            {
              state,
              component,
            }
          )
        );
      };

  const showVariableConfigModal = (e?: MouseEvent) => {
    e?.stopPropagation();
    setSettingsModalVisible(true);
  };

  const showValueModal = (e?: MouseEvent) => {
    e?.stopPropagation();
    setValueModalVisible(true);
  };

  const handleTempValueReset = () => {
    spawn(
      COMMANDS.component.resetStateValue.execute(
        studioCtx,
        {},
        {
          state,
          viewCtx: vc,
          component: vc.component,
        }
      )
    );
  };

  const menu = useVariableMenu({
    showVariableConfigModal,
    showValueModal,
    hasTempValue,
    handleTempValueReset,
    component,
    state,
    onRemove,
  });

  const modals = (
    <>
      <SidebarModal
        show={valueModalVisible}
        onClose={() => setValueModalVisible(false)}
        title={`Edit "${state.param.variable.name}" values`}
      >
        <div style={{ padding: "20px 20px 20px 15px" }}>
          <VariableValueEditor
            state={state}
            component={component}
            studioCtx={studioCtx}
            viewCtx={vc}
            disableInitialValue={!!state.implicitState}
            initialValueAbout={
              state.implicitState
                ? PREVIEW_DISABLED_TOOLTIP_MESSAGE[
                    state.implicitState.accessType
                  ]
                : undefined
            }
          />
        </div>
      </SidebarModal>
      <VariableEditingModal
        studioCtx={studioCtx}
        viewCtx={vc}
        state={state}
        show={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        component={component}
      />
    </>
  );

  return {
    menu,
    modals,
    props: {
      hasTempValue: hasTempValue,
      onRemove,
      showValueConfigModal: showValueModal,
      showVariableConfigModal,
      name: getStateDisplayName(state, "short"),
      value: value,
      isExternal: !isPrivateState(state),
      variableType: state.variableType as StateVariableType,
      menuButton: { menu },
    },
  };
}
