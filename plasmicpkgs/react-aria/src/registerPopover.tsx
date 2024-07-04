import { mergeProps } from "@react-aria/utils";
import React from "react";
import { Popover, PopoverContext } from "react-aria-components";
import { PlasmicPopoverContext } from "./contexts";
import {
  CodeComponentMetaOverrides,
  Registerable,
  registerComponentHelper,
} from "./utils";

export interface BasePopoverProps extends React.ComponentProps<typeof Popover> {
  className?: string;
  resetClassName?: string;
}

export function BasePopover(props: BasePopoverProps) {
  const { resetClassName, ...restProps } = props;
  const isStandalone = !React.useContext(PopoverContext);
  const contextProps = React.useContext(PlasmicPopoverContext);
  const mergedProps = mergeProps(contextProps, restProps, {
    className: `${resetClassName}`,
  });

  const triggerRef = React.useRef<any>(null);

  const standaloneProps = isStandalone
    ? {
        triggerRef,
        isNonModal: true,
        isOpen: true,
      }
    : {};

  return (
    <>
      {isStandalone && <div ref={triggerRef} />}
      <Popover {...mergedProps} {...standaloneProps} />
    </>
  );
}

export function registerPopover(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BasePopover>
) {
  registerComponentHelper(
    loader,
    BasePopover,
    {
      name: "plasmic-react-aria-popover",
      displayName: "Aria Popover",
      importPath: "@plasmicpkgs/react-aria/skinny/registerPopover",
      importName: "BasePopover",
      props: {
        children: {
          type: "slot",
        },
        offset: {
          type: "number",
          displayName: "Offset",
          description:
            "Additional offset applied vertically between the popover and its trigger",
          defaultValueHint: 0,
        },
        placement: {
          type: "choice",
          description:
            "Default placement of the popover relative to the trigger, if there is enough space",
          options: [
            "bottom",
            "bottom left",
            "bottom right",
            "top",
            "top left",
            "top right",
          ],
        },
        resetClassName: {
          type: "themeResetClass",
        },
      },
      styleSections: true,
    },
    overrides
  );
}
