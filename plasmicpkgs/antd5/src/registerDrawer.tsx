import { Drawer } from "antd";
import React from "react";
import { Registerable, registerComponentHelper } from "./utils";

export function AntdDrawer(
  props: React.ComponentProps<typeof Drawer> & {
    onOpenChange?: (open: boolean) => void;
    defaultStylesClassName?: string;
  }
) {
  const { onOpenChange, onClose, open, footer, ...rest } = props;
  const memoOnClose = React.useMemo(() => {
    if (onOpenChange || onClose) {
      return (e: React.MouseEvent | React.KeyboardEvent) => {
        onOpenChange?.(false);
        onClose?.(e);
      };
    } else {
      return undefined;
    }
  }, [onOpenChange, onClose]);

  return (
    <Drawer
      {...rest}
      onClose={memoOnClose}
      open={open}
      footer={footer ?? undefined}
      className={`${props.className} ${props.defaultStylesClassName}`}
    />
  );
}

export function registerDrawer(loader?: Registerable) {
  registerComponentHelper(loader, AntdDrawer, {
    name: "plasmic-antd5-drawer",
    displayName: "Drawer",
    props: {
      open: {
        type: "boolean",
      },
      placement: {
        type: "choice",
        options: ["top", "right", "bottom", "left"],
        defaultValueHint: "right",
      },
      children: {
        type: "slot",
        defaultValue: {
          type: "vbox",
          children: ["Drawer content"],
        },
      },
      title: {
        type: "slot",
        defaultValue: "Drawer title",
      },
      footer: {
        type: "slot",
        hidePlaceholder: true,
      },
      closeIcon: {
        type: "slot",
        hidePlaceholder: true,
      },
      onOpenChange: {
        type: "eventHandler",
        argTypes: [{ name: "open", type: "boolean" }],
      } as any,
      drawerScopeClassName: {
        type: "styleScopeClass",
        scopeName: "drawer",
      } as any,
      drawerClassName: {
        type: "class",
        displayName: "Drawer content styles",
        noSelf: true,
        selectors: [
          {
            selector: ":drawer .ant-drawer .ant-drawer-content",
            label: "Base",
          },
        ],
        advanced: true,
      } as any,
      closeButtonClassName: {
        type: "class",
        displayName: "Close button styles",
        noSelf: true,
        selectors: [
          {
            selector: ":drawer .ant-drawer .ant-drawer-close",
            label: "Base",
          },
        ],
        advanced: true,
      } as any,
      forceRender: {
        advanced: true,
        type: "boolean",
      },
      defaultStylesClassName: {
        type: "themeResetClass",
      } as any,
    },
    states: {
      open: {
        type: "writable",
        valueProp: "open",
        onChangeProp: "onOpenChange",
        variableType: "boolean",
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerDrawer",
    importName: "AntdDrawer",
  });
}
