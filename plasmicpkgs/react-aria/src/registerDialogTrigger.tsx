import { usePlasmicCanvasComponentInfo } from "@plasmicapp/host";
import React from "react";
import { DialogTrigger } from "react-aria-components";
import { PlasmicDialogTriggerContext } from "./contexts";
import { BUTTON_COMPONENT_NAME } from "./registerButton";
import { MODAL_COMPONENT_NAME } from "./registerModal";
import {
  CodeComponentMetaOverrides,
  Registerable,
  makeComponentName,
  registerComponentHelper,
} from "./utils";

export interface BaseDialogTriggerProps
  extends React.ComponentProps<typeof DialogTrigger> {
  trigger?: React.ReactNode;
  dialog?: React.ReactNode;
}

export function BaseDialogTrigger(props: BaseDialogTriggerProps) {
  const { trigger, dialog, isOpen, ...rest } = props;

  const { isSelected, selectedSlotName } =
    usePlasmicCanvasComponentInfo(props) ?? {};
  const isAutoOpen = selectedSlotName !== "trigger" && isSelected;

  const mergedProps = {
    ...rest,
    isOpen: (isAutoOpen || isOpen) ?? false,
  };

  return (
    <PlasmicDialogTriggerContext.Provider value={mergedProps}>
      <DialogTrigger {...mergedProps}>
        {trigger}
        {dialog}
      </DialogTrigger>
    </PlasmicDialogTriggerContext.Provider>
  );
}

export function registerDialogTrigger(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseDialogTrigger>
) {
  registerComponentHelper(
    loader,
    BaseDialogTrigger,
    {
      name: makeComponentName("dialogTrigger"),
      displayName: "Aria Dialog Trigger",
      importPath: "@plasmicpkgs/react-aria/skinny/registerDialogTrigger",
      importName: "BaseDialogTrigger",
      isAttachment: true,
      props: {
        trigger: {
          type: "slot",
          mergeWithParent: true,
          defaultValue: {
            type: "component",
            name: BUTTON_COMPONENT_NAME,
            props: {
              children: {
                type: "text",
                value: "Open Dialog",
              },
            },
          },
        },
        dialog: {
          type: "slot",
          mergeWithParent: true,
          defaultValue: {
            type: "component",
            name: MODAL_COMPONENT_NAME,
          },
        },
        isOpen: {
          type: "boolean",
          defaultValueHint: false,
          editOnly: true,
          uncontrolledProp: "defaultOpen",
        },
        onOpenChange: {
          type: "eventHandler",
          argTypes: [{ name: "isOpen", type: "boolean" }],
        },
      },
      states: {
        isOpen: {
          type: "writable",
          valueProp: "isOpen",
          onChangeProp: "onOpenChange",
          variableType: "boolean",
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
