import React from "react";
import { Popover } from "antd";
import { Registerable, registerComponentHelper } from "./utils";

export function AntdPopover(
  props: React.ComponentProps<typeof Popover> & {
    popoverScopeClassName?: string;
    contentText?: string
  }
) {
  const { overlayClassName, popoverScopeClassName, contentText, content, ...rest } = props;
  return (
    <Popover
        content={content || contentText}
        overlayClassName={`${overlayClassName} ${popoverScopeClassName}`}
        {...rest}
    />
  );
}

export function registerPopover(loader?: Registerable) {
  registerComponentHelper(loader, AntdPopover, {
    name: "plasmic-antd5-popover",
    displayName: "Popover",
    isAttachment: true,
    props: {
      open: {
        type: "boolean",
        editOnly: true,
        uncontrolledProp: "defaultOpen",
        description: "Default open state of the popover",
      },
      arrow: {
        type: "boolean",
        defaultValue: true,
        advanced: true,
      },
      children: {
        type: "slot",
        defaultValue: "This text element is wrapped in a Popover component",
        mergeWithParent: true,
      } as any,
      popoverScopeClassName: {
        type: "styleScopeClass",
        scopeName: "popover",
      } as any,
      popoverContentClassName: {
        type: "class",
        displayName: "Popover content",
        selectors: [
          {
            selector: ":popover.ant-popover .ant-popover-inner",
            label: "Base",
          },
        ],
      },
      overlayClassName: {
        type: "class",
        displayName: "Overlay",
      },
      content: {
        type: "slot",
        displayName: "Popover contents",
        defaultValue: "Popover contents",
        hidePlaceholder: true,
      },
    /**
     *  NOTE: contentText ensures that the popover shows as a custom behaviour without modifications 
     * (when a random element is given a custom behaviour of Popover, the props of type "slot" do not receive any default value.
     * Therefore we use the contentText which has a string default value, so that the popover shows with at least something)
     *  */  
      contentText: {
        type: "string",
        displayName: "Popover contents",
        description: "What gets shown inside the popover on hover",
        defaultValue: "Popover contents",
      },
      title: {
        type: "slot",
        displayName: "Popover title",
        hidePlaceholder: true,
        defaultValue: "Popover title",
      },
      color: {
        type: "color",
        description: "Popover fill color",
      },
      trigger: {
        type: "choice",
        options: ["hover", "focus", "click"],
        defaultValueHint: "hover",
        advanced: true,
      },
      placement: {
        type: "choice",
        options: [
          "topLeft",
          "top",
          "topRight",
          "leftTop",
          "left",
          "leftBottom",
          "rightTop",
          "right",
          "rightBottom",
          "bottomLeft",
          "bottom",
          "bottomRight",
        ],
        description: "Default placement of popover",
        defaultValueHint: "top",
      },
      mouseEnterDelay: {
        type: "number",
        description: "Delay in seconds, before popover is shown on mouse enter",
        defaultValue: 0,
        advanced: true,
      },
      mouseLeaveDelay: {
        type: "number",
        description:
          "Delay in seconds, before popover is hidden on mouse leave",
        defaultValue: 0,
        advanced: true,
      },
      onOpenChange: {
        type: "eventHandler",
        argTypes: [{ name: "open", type: "boolean" }],
        advanced: true,
      },
    },
    states: {
      open: {
        type: "writable",
        valueProp: "open",
        onChangeProp: "onOpenChange",
        variableType: "boolean",
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerPopover",
    importName: "AntdPopover",
  });
}
