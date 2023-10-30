import { Input, InputNumber } from "antd";
import React from "react";
import { Registerable, registerComponentHelper } from "./utils";

export const AntdInput = Input;
export const AntdTextArea = Input.TextArea;
export const AntdPassword = Input.Password;
export const AntdInputNumber: typeof InputNumber = InputNumber;

export const inputHelpers = {
  states: {
    value: {
      onChangeArgsToValue: (
        e: Parameters<
          NonNullable<React.ComponentProps<typeof Input>["onChange"]>
        >[0]
      ) => {
        return e.target.value;
      },
    },
  },
};

const COMMON_HELPERS_CONFIG = {
  helpers: inputHelpers,
  importName: "inputHelpers",
  importPath: "@plasmicpkgs/antd5/skinny/registerInput",
} as const;
const COMMON_STATES = {
  value: {
    type: "writable",
    valueProp: "value",
    variableType: "text",
    onChangeProp: "onChange",
    hidden: (ps: any) => !!ps.__plasmicFormField,
  },
} as const;

const COMMON_DECORATOR_PROPS = {
  prefix: {
    type: "slot",
    hidePlaceholder: true,
  },
  suffix: {
    type: "slot",
    hidePlaceholder: true,
  },
  addonAfter: {
    type: "slot",
    hidePlaceholder: true,
  },
  addonBefore: {
    type: "slot",
    hidePlaceholder: true,
  },
} as const;

const COMMON_ADVANCED_PROPS = {
  maxLength: {
    type: "number",
    advanced: true,
  },
  bordered: {
    type: "boolean",
    advanced: true,
    defaultValueHint: true,
  },
  allowClear: {
    type: "boolean",
    advanced: true,
  },
  autoFocus: {
    type: "boolean",
    advanced: true,
  },
  readOnly: {
    type: "boolean",
    advanced: true,
  },
} as const;

const COMMON_EVENT_HANDLERS = {
  onChange: {
    type: "eventHandler",
    argTypes: [
      {
        name: "event",
        type: "object",
      },
    ] as any,
  },
  onPressEnter: {
    type: "eventHandler",
    argTypes: [
      {
        name: "event",
        type: "object",
      },
    ] as any,
  },
} as const;

export const inputComponentName = "plasmic-antd5-input";

export function registerInput(loader?: Registerable) {
  registerComponentHelper(loader, AntdInput, {
    name: inputComponentName,
    displayName: "Input",
    props: {
      value: {
        type: "string",
        hidden: (ps: any) => !!ps.__plasmicFormField,
      },
      placeholder: {
        type: "string",
      },
      size: {
        type: "choice",
        options: ["large", "middle", "small"],
      },
      disabled: {
        type: "boolean",
      },
      type: {
        type: "choice",
        options: [
          "text",
          "password",
          "number",
          "date",
          "datetime-local",
          "time",
          "email",
          "tel",
          "hidden",
        ],
        defaultValueHint: "text",
      },
      ...COMMON_ADVANCED_PROPS,
      ...COMMON_DECORATOR_PROPS,
      ...COMMON_EVENT_HANDLERS,
    },
    states: {
      ...COMMON_STATES,
    },
    ...({ trapsSelection: true } as any),
    componentHelpers: COMMON_HELPERS_CONFIG,
    importPath: "@plasmicpkgs/antd5/skinny/registerInput",
    importName: "AntdInput",
  });
}

export const textAreaComponentName = "plasmic-antd5-textarea";

export function registerTextArea(loader?: Registerable) {
  registerComponentHelper(loader, AntdTextArea, {
    name: textAreaComponentName,
    parentComponentName: inputComponentName,
    displayName: "Text Area",
    props: {
      value: {
        type: "string",
        hidden: (ps: any) => !!ps.__plasmicFormField,
      },
      placeholder: {
        type: "string",
      },
      disabled: {
        type: "boolean",
      },
      maxLength: {
        type: "number",
        advanced: true,
      },
      bordered: {
        type: "boolean",
        advanced: true,
        defaultValueHint: true,
      },
      ...COMMON_EVENT_HANDLERS,
    },
    states: {
      ...COMMON_STATES,
    },
    componentHelpers: COMMON_HELPERS_CONFIG,
    importPath: "@plasmicpkgs/antd5/skinny/registerInput",
    importName: "AntdTextArea",
  });
}

export const passwordComponentName = "plasmic-antd5-input-password";

export function registerPasswordInput(loader?: Registerable) {
  registerComponentHelper(loader, AntdPassword, {
    name: passwordComponentName,
    parentComponentName: inputComponentName,
    displayName: "Password Input",
    props: {
      value: {
        type: "string",
        hidden: (ps: any) => !!ps.__plasmicFormField,
      },
      placeholder: {
        type: "string",
      },
      disabled: {
        type: "boolean",
      },
      maxLength: {
        type: "number",
        advanced: true,
      },

      bordered: {
        type: "boolean",
        advanced: true,
        defaultValueHint: true,
      },
      ...COMMON_EVENT_HANDLERS,
    },
    states: {
      ...COMMON_STATES,
    },
    componentHelpers: COMMON_HELPERS_CONFIG,
    importPath: "@plasmicpkgs/antd5/skinny/registerInput",
    importName: "AntdPassword",
  });
}

export const inputNumberComponentName = "plasmic-antd5-input-number";

export function registerNumberInput(loader?: Registerable) {
  registerComponentHelper(loader, AntdInputNumber, {
    name: inputNumberComponentName,
    parentComponentName: inputComponentName,
    displayName: "Number Input",
    props: {
      value: {
        type: "number",
        hidden: (ps: any) => !!ps.__plasmicFormField,
      },
      placeholder: {
        type: "string",
      },
      disabled: {
        type: "boolean",
      },
      max: {
        type: "number",
      },
      min: {
        type: "number",
      },
      step: {
        type: "number",
        helpText: "Increment or decrement step",
      },
      controls: {
        type: "boolean",
        displayName: "Show add/minus controls?",
        advanced: true,
      },
      ...COMMON_DECORATOR_PROPS,
      ...COMMON_ADVANCED_PROPS,
      ...COMMON_EVENT_HANDLERS,
      // onChange directly called with the number
      onChange: {
        type: "eventHandler",
        argTypes: [
          {
            name: "value",
            type: "number",
          },
        ],
      },
    },
    states: {
      ...COMMON_STATES,
    },
    ...({ trapsSelection: true } as any),
    // don't need component helpers
    importPath: "@plasmicpkgs/antd5/skinny/registerInput",
    importName: "AntdInputNumber",
  });
}
