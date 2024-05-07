import { Component, Expr, isKnownTplSlot, State } from "@/wab/classes";
import { MenuBuilder } from "@/wab/client/components/menu-builder";
import { PropEditorRow } from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import { VariableEditingModal } from "@/wab/client/components/sidebar-tabs/StateManagement/VariableEditingModal";
import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { assert, ensure, spawn } from "@/wab/common";
import { canDeleteState } from "@/wab/components";
import { codeLit, getRawCode, tryExtractJson } from "@/wab/exprs";
import { wabTypeToPropType } from "@/wab/shared/code-components/code-components";
import {
  convertVariableTypeToPropType,
  convertVariableTypeToWabType,
} from "@/wab/shared/core/model-util";
import { evalCodeWithEnv } from "@/wab/shared/eval";
import { VARIABLE_LOWER } from "@/wab/shared/Labels";
import {
  getStateDisplayName,
  isPrivateState,
  isReadonlyState,
  StateAccessType,
  StateVariableType,
} from "@/wab/states";
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
  });

  builder.genSection(undefined, (push) => {
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
        Reset value
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

const DISABLED_TOOLTIP_MESSAGE: Record<
  Exclude<StateAccessType, "private">,
  string
> = {
  writable:
    "For the read and write states, the initial value depends on the variant. Therefore, you should set them in the settings tab.",
  readonly: "It is not possible to update a read-only state.",
};

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
  const env = vc.getCanvasEnvForTpl(component.tplTree) ?? {};

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
          studioCtx.change(({ success }) => {
            studioCtx.siteOps().removeState(component, state);
            return success();
          })
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
      studioCtx.change(({ success }) => {
        vc.setCanvasStateValue(state, initialValue);
        setDraft(undefined);
        return success();
      })
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

  // This is a best-effort approach to get the current canvas state value
  // to use it as default value for preview. If the current value is not
  // serializable (e.g. a function, or a recursive object), we simply set
  // it to undefined.
  const currentVal = (() => {
    const val = vc.getCanvasStateValue(state);
    try {
      return codeLit(val);
    } catch (_) {
      return undefined;
    }
  })();
  const [draft, setDraft] = React.useState<Expr | undefined>(undefined);
  const expr = draft ?? currentVal;

  const modals = (
    <>
      <SidebarModal
        show={valueModalVisible}
        onClose={() => setValueModalVisible(false)}
        title={`Edit "${state.param.variable.name}" values`}
      >
        <div style={{ padding: "20px 20px 20px 15px" }}>
          <div className={"mb-m"}>
            <PropEditorRow
              viewCtx={vc}
              tpl={component.tplTree}
              label="Initial Value"
              attr="initial-value"
              expr={state.param.defaultExpr ?? undefined}
              definedIndicator={{ source: "none" }}
              valueSetState={"isSet"}
              propType={convertVariableTypeToPropType(
                state.variableType as StateVariableType
              )}
              onChange={(_expr) =>
                studioCtx.change(({ success }) => {
                  state.param.defaultExpr = _expr;
                  return success();
                })
              }
              disableLinkToProp={true}
              about={
                state.implicitState &&
                DISABLED_TOOLTIP_MESSAGE[state.implicitState.accessType]
              }
              disabled={!!state.implicitState}
            />
          </div>
          <PropEditorRow
            viewCtx={vc}
            tpl={component.tplTree}
            label="Preview value"
            attr="preview-value"
            about={
              state.implicitState && isReadonlyState(state.implicitState)
                ? DISABLED_TOOLTIP_MESSAGE[state.implicitState.accessType]
                : `
              Temporarily set a value for
              this variable to preview how your
              component would look or behave.
              `
            }
            disabled={
              state.implicitState ? isReadonlyState(state.implicitState) : false
            }
            expr={expr}
            definedIndicator={
              hasTempValue && expr
                ? {
                    source: "setNonVariable",
                    prop: "preview-value",
                    value: tryExtractJson(expr),
                  }
                : { source: "none" }
            }
            valueSetState={"isSet"}
            propType={wabTypeToPropType(
              convertVariableTypeToWabType(
                state.variableType as StateVariableType
              )
            )}
            onChange={(_expr) => {
              if (!_expr) {
                return;
              }
              setDraft(_expr);
              const code = getRawCode(_expr, {
                projectFlags: studioCtx.projectFlags(),
                component,
                inStudio: true,
              });
              const newValue = evalCodeWithEnv(code, env);
              vc.setCanvasStateValue(state, newValue);
            }}
            onDelete={() => {
              setDraft(undefined);
              vc.resetCanvasStateValue(state);
            }}
            disableLinkToProp={true}
            disableDynamicValue={true}
          />
        </div>
      </SidebarModal>
      <VariableEditingModal
        studioCtx={studioCtx}
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
