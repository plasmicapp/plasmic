import React from "react";
import { mergeProps, useButton } from "react-aria";
import { DialogTrigger, DialogTriggerProps } from "react-aria-components";
import { COMMON_STYLES } from "./common";
import { PlasmicDialogTriggerContext } from "./contexts";
import { BUTTON_COMPONENT_NAME } from "./registerButton";
import { DIALOG_COMPONENT_NAME } from "./registerDialog";
import {
  MODAL_COMPONENT_NAME,
  MODAL_DEFAULT_SLOT_CONTENT,
} from "./registerModal";
import {
  CodeComponentMetaOverrides,
  PlasmicCanvasProps,
  Registerable,
  makeComponentName,
  registerComponentHelper,
  useIsOpen,
} from "./utils";

export interface TriggerWrapperProps {
  children?: React.ReactNode;
  className?: string;
}

/*
  React Aria's DialogTrigger requires a Aria Button as trigger.
  (Aria Button works as a trigger because it uses useButton behind the scenes).
  So we use useButton as well for our custom trigger.

  Discussion (React-aria-components DialogTrigger with custom button):
  https://github.com/adobe/react-spectrum/discussions/5119#discussioncomment-7084661

  */
export function TriggerWrapper({ children, className }: TriggerWrapperProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const { buttonProps } = useButton({}, ref);

  const mergedProps = mergeProps(buttonProps, {
    ref,
    // We expose className to allow user control over the wrapper div's styling.
    className,
    style: COMMON_STYLES,
  });

  return <div {...mergedProps}>{children}</div>;
}

export interface BaseDialogTriggerProps
  extends Omit<DialogTriggerProps, "children">,
    PlasmicCanvasProps {
  trigger?: React.ReactNode;
  dialog?: React.ReactNode;
  className?: string;
}

export function BaseDialogTrigger(props: BaseDialogTriggerProps) {
  const { trigger, dialog, isOpen, className, ...rest } = props;

  const canvasAwareIsOpen = useIsOpen({
    triggerSlotName: "trigger",
    isOpen,
    props,
  });

  const mergedProps = {
    ...rest,
    isOpen: canvasAwareIsOpen,
  };

  return (
    // PlasmicDialogTriggerContext is used by BaseModal
    <PlasmicDialogTriggerContext.Provider value={mergedProps}>
      <DialogTrigger {...mergedProps}>
        {trigger && (
          <TriggerWrapper className={className}>{trigger}</TriggerWrapper>
        )}
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
          defaultValue: [
            {
              type: "component",
              name: MODAL_COMPONENT_NAME,
              props: {
                children: {
                  type: "component",
                  name: DIALOG_COMPONENT_NAME,
                  props: {
                    children: MODAL_DEFAULT_SLOT_CONTENT,
                  },
                },
              },
            },
          ],
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
