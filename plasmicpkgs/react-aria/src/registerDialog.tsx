import { usePlasmicCanvasContext } from "@plasmicapp/host";
import React from "react";
import { Dialog, DialogProps } from "react-aria-components";
import { COMMON_STYLES } from "./common";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

export interface BaseDialogProps extends DialogProps {
  children: React.ReactNode;
}

export function BaseDialog({ children, className }: BaseDialogProps) {
  const canvasContext = usePlasmicCanvasContext();

  if (canvasContext) {
    /* <Dialog> cannot be used in canvas, because while the dialog is open on the canvas, the focus is trapped inside it, so any Studio modals like the Color Picker modal would glitch due to focus jumping back and forth */
    return (
      <div className={className} style={COMMON_STYLES}>
        {children}
      </div>
    );
  } else {
    return (
      <Dialog className={className} style={COMMON_STYLES}>
        {children}
      </Dialog>
    );
  }
}

export const DIALOG_COMPONENT_NAME = makeComponentName("dialog");

export function registerDialog(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseDialog>
) {
  registerComponentHelper(
    loader,
    BaseDialog,
    {
      name: DIALOG_COMPONENT_NAME,
      displayName: "Aria Dialog",
      importPath: "@plasmicpkgs/react-aria/skinny/registerDialog",
      importName: "BaseDialog",
      props: {
        children: {
          type: "slot",
          mergeWithParent: true,
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
