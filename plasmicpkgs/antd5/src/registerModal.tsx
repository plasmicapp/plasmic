import { Modal } from "antd";
import React from "react";
import { Registerable, registerComponentHelper } from "./utils";

export function AntdModal(
  props: React.ComponentProps<typeof Modal> & {
    onOpenChange?: (open: boolean) => void;
    defaultStylesClassName?: string;
  }
) {
  const { onOpenChange, onOk, onCancel, open, footer, ...rest } = props;
  const memoOnOk = React.useMemo(() => {
    if (onOpenChange || onOk) {
      return (e: React.MouseEvent<HTMLButtonElement>) => {
        onOpenChange?.(false);
        onOk?.(e);
      };
    } else {
      return undefined;
    }
  }, [onOpenChange, onOk]);
  const memoOnCancel = React.useMemo(() => {
    if (onOpenChange || onCancel) {
      return (e: React.MouseEvent<HTMLButtonElement>) => {
        onOpenChange?.(false);
        onCancel?.(e);
      };
    } else {
      return undefined;
    }
  }, [onOpenChange, onCancel]);

  return (
    <Modal
      {...rest}
      onOk={memoOnOk}
      onCancel={memoOnCancel}
      open={open}
      footer={footer ?? undefined}
      className={`${props.className} ${props.defaultStylesClassName}`}
    />
  );
}

export function registerModal(loader?: Registerable) {
  registerComponentHelper(loader, AntdModal, {
    name: "plasmic-antd5-modal",
    displayName: "Modal",
    props: {
      open: {
        type: "boolean",
      },
      children: {
        type: "slot",
        defaultValue: {
          type: "vbox",
          children: ["Modal content"],
        },
      },
      title: {
        type: "slot",
        defaultValue: "Modal title",
      },
      footer: {
        type: "slot",
        hidePlaceholder: true,
      },
      closeIcon: {
        type: "slot",
        hidePlaceholder: true,
      },
      onOk: {
        type: "eventHandler",
        argTypes: [],
      } as any,
      onCancel: {
        type: "eventHandler",
        argTypes: [],
      } as any,
      okText: {
        type: "string",
        hidden: (ps) => !!ps.footer,
        advanced: true,
      },
      cancelText: {
        type: "string",
        hidden: (ps) => !!ps.footer,
        advanced: true,
      },
      onOpenChange: {
        type: "eventHandler",
        argTypes: [{ name: "open", type: "boolean" }],
      } as any,
      modalScopeClassName: {
        type: "styleScopeClass",
        scopeName: "modal",
      } as any,
      modalClassName: {
        type: "class",
        displayName: "Modal content styles",
        noSelf: true,
        selectors: [
          {
            selector: ":modal .ant-modal .ant-modal-content",
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
            selector: ":modal .ant-modal .ant-modal-close",
            label: "Base",
          },
        ],
        advanced: true,
      } as any,
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
    importPath: "@plasmicpkgs/antd5/skinny/registerModal",
    importName: "AntdModal",
  });
}
