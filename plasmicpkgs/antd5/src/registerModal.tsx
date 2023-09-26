import { Modal } from "antd";
import React from "react";
import { Registerable, registerComponentHelper } from "./utils";

export function AntdModal(
  props: React.ComponentProps<typeof Modal> & {
    onOpenChange?: (open: boolean) => void;
    defaultStylesClassName?: string;
    modalScopeClassName: string;
    wrapClassName: string;
    hideFooter?: boolean;
  }
) {
  const {
    onOpenChange,
    onOk,
    onCancel,
    open,
    footer,
    hideFooter,
    modalScopeClassName,
    wrapClassName,
    ...rest
  } = props;
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
      footer={hideFooter ? null : footer ?? undefined}
      wrapClassName={wrapClassName}
      className={`${props.className} ${props.defaultStylesClassName} ${modalScopeClassName}`}
    />
  );
}

export function registerModal(loader?: Registerable) {
  registerComponentHelper(loader, AntdModal, {
    name: "plasmic-antd5-modal",
    displayName: "Modal",
    description:
      "[See tutorial video](https://www.youtube.com/watch?v=TkjxNJIFun8)",
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
        hidden: (ps) => ps.hideFooter ?? false,
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
      hideFooter: {
        type: "boolean",
        description: "Hide the modal footer slot",
        advanced: true,
      },
      onOpenChange: {
        type: "eventHandler",
        argTypes: [{ name: "open", type: "boolean" }],
      } as any,
      wrapClassName: {
        type: "class",
        displayName: "Modal container",
        styleSections: ["background"],
      },
      modalScopeClassName: {
        type: "styleScopeClass",
        scopeName: "modal",
      } as any,
      modalContentClassName: {
        type: "class",
        displayName: "Modal content",
        noSelf: true,
        selectors: [
          {
            selector: ":modal .ant-modal-content",
            label: "Base",
          },
        ],
      } as any,
      closeButtonClassName: {
        type: "class",
        displayName: "Close button",
        noSelf: true,
        selectors: [
          {
            selector: ":modal .ant-modal-close",
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
    templates: {
      "Modal Form": {
        props: {
          children: {
            type: "component",
            name: "plasmic-antd5-form",
          },
          hideFooter: true,
        },
      },
      "Generic Modal": {},
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerModal",
    importName: "AntdModal",
  });
}
