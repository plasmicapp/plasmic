import { COMMANDS } from "@/wab/client/commands/command";
import VariableEditingForm from "@/wab/client/components/sidebar-tabs/StateManagement/VariableEditingForm";
import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { VARIABLE_CAP } from "@/wab/shared/Labels";
import { Component, State } from "@/wab/shared/model/classes";
import startCase from "lodash/startCase";
import React from "react";

export function VariableEditingModal({
  component,
  onClose,
  show,
  studioCtx,
  state,
  mode = "edit",
}: {
  state?: State | null;
  show: boolean;
  onClose: () => any;
  studioCtx: StudioCtx;
  component: Component;
  mode?: "new" | "edit";
}) {
  const preventCancellingRef = React.useRef(false);

  React.useEffect(() => {
    preventCancellingRef.current = false;
  }, [state]);

  const onCancel = async () => {
    if (!state || preventCancellingRef.current) {
      return;
    }
    await COMMANDS.component.removeStateVariable.execute(
      studioCtx,
      {},
      {
        state,
        component,
      }
    );
    onClose();
  };

  return (
    <SidebarModal
      title={startCase(`${mode} ${VARIABLE_CAP}`)}
      show={show}
      // For mode === "new", we block the modal from auto-closing (via
      // persitOnInteractOutside), and we handle the closing explicitly
      // via onCancel
      onClose={mode === "edit" ? onClose : undefined}
      // If creating a new variable, it is only created upon clicking
      // the confirm button, so we don't allow you to dismiss the
      // modal so easily
      persistOnInteractOutside={mode === "new"}
    >
      {state && (
        <VariableEditingForm
          state={state}
          studioCtx={studioCtx}
          component={component}
          mode={mode}
          onConfirm={() => {
            preventCancellingRef.current = true;
            onClose();
          }}
          onCancel={onCancel}
        />
      )}
    </SidebarModal>
  );
}
