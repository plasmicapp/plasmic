import { usePlasmicCanvasContext } from "@plasmicapp/host";
import { mergeProps } from "@react-aria/utils";
import React from "react";
import { Popover, PopoverContext } from "react-aria-components";
import { PlasmicPopoverContext } from "./contexts";
import {
  CodeComponentMetaOverrides,
  Registerable,
  registerComponentHelper,
} from "./utils";

export function BasePopover(props: {
  className?: string;
  resetClassName?: string;
}) {
  const { resetClassName, ...restProps } = props;
  const isStandalone = !React.useContext(PopoverContext);
  const contextProps = React.useContext(PlasmicPopoverContext);
  const canvas = usePlasmicCanvasContext();
  const mergedProps = mergeProps(contextProps, restProps, {
    className: `${props.resetClassName}`,
  });

  if (isStandalone) {
    const triggerRef = React.useRef<any>(null);
    return (
      <>
        <div ref={triggerRef} />
        <Popover
          {...mergedProps}
          triggerRef={triggerRef}
          isNonModal={true}
          isOpen={true}
        />
      </>
    );
  } else {
    return <Popover {...mergedProps} isNonModal={!!canvas} />;
  }
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
      displayName: "BasePopover",
      importPath: "@plasmicpkgs/react-aria/registerPopover",
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
