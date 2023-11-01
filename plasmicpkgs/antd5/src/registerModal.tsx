import type { StyleSection } from "@plasmicapp/host/registerComponent";
import { Modal } from "antd";
import React, { ReactElement, useMemo, useState } from "react";
import { Registerable, registerComponentHelper } from "./utils";

// hide sizing section, as width can only be set via a width prop, and not css!
const styleSections: StyleSection[] = [
  "visibility",
  "typography",
  "spacing",
  "background",
  "transform",
  "transitions",
  "layout",
  "overflow",
  "border",
  "shadows",
  "effects",
];

export function AntdModal(
  props: React.ComponentProps<typeof Modal> & {
    onOpenChange?: (open: boolean) => void;
    defaultStylesClassName?: string;
    modalScopeClassName: string;
    wrapClassName: string;
    hideFooter?: boolean;
    trigger?: ReactElement;
  }
) {
  const [isOpen, setIsOpen] = useState(false);

  const {
    onOpenChange,
    onOk,
    onCancel,
    open,
    width,
    footer,
    hideFooter,
    modalScopeClassName,
    wrapClassName,
    trigger,
    ...rest
  } = props;

  const memoOnOk = React.useMemo(() => {
    if (onOpenChange || onOk) {
      return (e: React.MouseEvent<HTMLButtonElement>) => {
        setIsOpen(false);
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
        setIsOpen(false);
        onOpenChange?.(false);
        onCancel?.(e);
      };
    } else {
      return undefined;
    }
  }, [onOpenChange, onCancel]);

  const widthProp = useMemo(() => {
    if (!width) return undefined;
    if (typeof width === "number") return width;
    if (typeof width !== "string") return undefined;
    if (/^\d+$/.test(width)) {
      return +width;
    }
    return width;
  }, [width]);

  return (
    <>
      <Modal
        {...rest}
        onOk={memoOnOk}
        width={widthProp}
        onCancel={memoOnCancel}
        open={isOpen || open}
        footer={hideFooter ? null : footer ?? undefined}
        wrapClassName={wrapClassName}
        className={`${props.className} ${props.defaultStylesClassName} ${modalScopeClassName}`}
      />
      {trigger ? <div onClick={() => setIsOpen(true)}>{trigger}</div> : null}
    </>
  );
}

export function registerModal(loader?: Registerable) {
  registerComponentHelper(loader, AntdModal, {
    name: "plasmic-antd5-modal",
    displayName: "Modal",
    styleSections,
    description:
      "[See tutorial video](https://www.youtube.com/watch?v=TkjxNJIFun8)",
    props: {
      open: {
        type: "boolean",
      },
      width: {
        type: "string",
        defaultValueHint: "520px",
        description: "Change the width of the modal",
        helpText:
          "Default unit is px. You can also use % or other units for width.",
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
      trigger: {
        type: "slot",
        hidePlaceholder: true,
        defaultValue: {
          type: "component",
          name: "plasmic-antd5-button",
          props: {
            children: {
              type: "text",
              value: "Show modal",
            },
          },
        },
        ...({
          mergeWithParent: true,
        } as any),
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
      maskClosable: {
        type: "boolean",
        displayName: "Close modal on outside click?",
        description:
          "Whether to close the modal when user clicks outside the modal",
        defaultValueHint: true,
      },
      wrapClassName: {
        type: "class",
        displayName: "Modal overlay",
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
        styleSections,
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
