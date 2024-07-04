import React from "react";
import { DialogTrigger } from "react-aria-components";
import {
  CodeComponentMetaOverrides,
  Registerable,
  makeComponentName,
  registerComponentHelper,
} from "./utils";

interface BaseDialogTriggerProps
  extends React.ComponentProps<typeof DialogTrigger> {
  trigger: React.ReactNode;
  dialog: React.ReactNode;
}

export function BaseDialogTrigger(props: BaseDialogTriggerProps) {
  const { trigger, dialog, ...rest } = props;

  return (
    <DialogTrigger {...rest}>
      {trigger}
      {dialog}
    </DialogTrigger>
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
        },
        dialog: {
          type: "slot",
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
