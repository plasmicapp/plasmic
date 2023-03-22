import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import Input, {
  GroupProps,
  InputProps,
  PasswordProps,
  SearchProps,
  TextAreaProps,
} from "antd/lib/input";
import InputGroup from "antd/lib/input/Group";
import Password from "antd/lib/input/Password";
import Search from "antd/lib/input/Search";
import TextArea from "antd/lib/input/TextArea";
import { Registerable } from "./registerable";

function sortObjectKeys<T extends {}>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).sort()) as T;
}

type PropSpec<T> = ComponentMeta<T>["props"];

function sortProps<T>(props: PropSpec<T>): PropSpec<T> {
  return sortObjectKeys(props);
}

const commonHtmlAttributes = {
  "aria-label": {
    type: "string",
    description: "The ARIA label for this input",
  },
  "aria-labelledby": {
    type: "string",
    description: "Identifies the element(s) that labels this input",
  },
  name: {
    type: "string",
    description: "The HTML name of the input",
  },
} as const;

export const inputHelpers = {
  helpers: {
    states: {
      value: {
        onChangeArgsToValue: (
          e: Parameters<NonNullable<InputProps["onChange"]>>[0]
        ) => e.target.value,
      },
    },
  },
  importName: "inputHelpers",
  importPath: "@plasmicpkgs/plasmic-antd/registerInput",
};

export const inputMeta: ComponentMeta<InputProps> = {
  name: "AntdInput",
  displayName: "Antd Input",
  props: sortProps<InputProps>({
    ...commonHtmlAttributes,
    addonAfter: {
      type: "slot",
      hidePlaceholder: true,
    },
    addonBefore: {
      type: "slot",
      hidePlaceholder: true,
    },
    allowClear: {
      type: "boolean",
      description: "If allow to remove input content with clear icon",
      defaultValueHint: false,
    },
    bordered: {
      type: "boolean",
      description: "Whether has border style",
      defaultValueHint: true,
    },
    disabled: {
      type: "boolean",
      description: "Whether the input is disabled",
      defaultValueHint: false,
    },
    id: {
      type: "string",
      description: "The ID for input",
    },
    maxLength: {
      type: "number",
      description: "The max length",
    },
    placeholder: {
      type: "string",
      description: "Placeholder for the input",
    },
    prefix: {
      type: "slot",
      hidePlaceholder: true,
    },
    size: {
      type: "choice",
      options: ["small", "middle", "large"],
      description: "The size of the input box",
      defaultValueHint: "middle,",
    },
    suffix: {
      type: "slot",
      hidePlaceholder: true,
    },
    type: {
      type: "string",
      description: "The type of input",
      defaultValueHint: "text",
    },
    value: {
      type: "string",
    },
    onChange: {
      type: "eventHandler",
      argTypes: [
        {
          name: "event",
          type: "object",
        },
      ],
    },
  }),
  states: {
    value: {
      type: "writable",
      variableType: "text",
      onChangeProp: "onChange",
      valueProp: "value",
    },
  },
  componentHelpers: inputHelpers,
  importPath: "antd/lib/input",
  importName: "Input",
  isDefaultExport: true,
};

export function registerInput(
  loader?: Registerable,
  customInputMeta?: ComponentMeta<InputProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Input, customInputMeta ?? inputMeta);
}

export const inputTextAreaMeta: ComponentMeta<TextAreaProps> = {
  name: "AntdInputTextArea",
  displayName: "Antd Input Text Area",
  props: sortProps<TextAreaProps>({
    ...commonHtmlAttributes,
    allowClear: {
      type: "boolean",
      description: "If allow to remove input content with clear icon",
      defaultValueHint: false,
    },
    autoSize: {
      type: "object",
      description:
        "Height autosize feature, can be set to true | false or an object { minRows: 2, maxRows: 6 }",
    },
    disabled: {
      type: "boolean",
      description: "Whether the input is disabled",
      defaultValueHint: false,
    },
    bordered: {
      type: "boolean",
      description: "Whether has border style",
      defaultValueHint: true,
    },
    showCount: {
      type: "boolean",
      description: "Whether show text count",
      defaultValueHint: false,
    },
    id: {
      type: "string",
      description: "The ID for input",
    },
    maxLength: {
      type: "number",
      description: "The max length",
    },
    placeholder: {
      type: "string",
      description: "Placeholder for the input",
    },
    value: {
      type: "string",
    },
    onChange: {
      type: "eventHandler",
      argTypes: [
        {
          name: "event",
          type: "object",
        },
      ],
    },
  }),
  states: {
    value: {
      type: "writable",
      variableType: "text",
      onChangeProp: "onChange",
      valueProp: "value",
    },
  },
  componentHelpers: inputHelpers,
  importPath: "antd/lib/input/TextArea",
  importName: "TextArea",
  isDefaultExport: true,
  parentComponentName: "AntdInput",
};

export function registerInputTextArea(
  loader?: Registerable,
  customInputTextAreaMeta?: ComponentMeta<TextAreaProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(TextArea, customInputTextAreaMeta ?? inputTextAreaMeta);
}

export const inputSearchMeta: ComponentMeta<SearchProps> = {
  name: "AntdInputSearch",
  displayName: "Antd Input Search",
  props: sortProps<SearchProps>({
    ...commonHtmlAttributes,
    addonBefore: {
      type: "slot",
      hidePlaceholder: true,
    },
    allowClear: {
      type: "boolean",
      description: "If allow to remove input content with clear icon",
      defaultValueHint: false,
    },
    bordered: {
      type: "boolean",
      description: "Whether has border style",
      defaultValueHint: true,
    },
    disabled: {
      type: "boolean",
      description: "Whether the input is disabled",
      defaultValueHint: false,
    },
    enterButton: {
      type: "slot",
      hidePlaceholder: true,
    },
    id: {
      type: "string",
      description: "The ID for input",
    },
    loading: {
      type: "boolean",
      description: "Search box with loading",
      defaultValueHint: false,
    },
    maxLength: {
      type: "number",
      description: "The max length",
    },
    placeholder: {
      type: "string",
      description: "Placeholder for the input",
    },
    prefix: {
      type: "slot",
      hidePlaceholder: true,
    },
    size: {
      type: "choice",
      options: ["small", "middle", "large"],
      description: "The size of the input box",
      defaultValueHint: "middle",
    },
    suffix: {
      type: "slot",
      hidePlaceholder: true,
    },
    type: {
      type: "string",
      description: "The type of input",
    },
    value: {
      type: "string",
    },
    onChange: {
      type: "eventHandler",
      argTypes: [
        {
          name: "event",
          type: "object",
        },
      ],
    },
  }),
  states: {
    value: {
      type: "writable",
      variableType: "text",
      onChangeProp: "onChange",
      valueProp: "value",
    },
  },
  componentHelpers: inputHelpers,
  importPath: "antd/lib/input/Search",
  importName: "Search",
  isDefaultExport: true,
  parentComponentName: "AntdInput",
};

export function registerInputSearch(
  loader?: Registerable,
  customInputSearchMeta?: ComponentMeta<SearchProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Search, customInputSearchMeta ?? inputSearchMeta);
}

export const inputPasswordMeta: ComponentMeta<PasswordProps> = {
  name: "AntdInputPassword",
  displayName: "Antd Input Password",
  props: sortProps<PasswordProps>({
    ...commonHtmlAttributes,
    addonAfter: {
      type: "slot",
      hidePlaceholder: true,
    },
    addonBefore: {
      type: "slot",
      hidePlaceholder: true,
    },
    allowClear: {
      type: "boolean",
      description: "If allow to remove input content with clear icon",
      defaultValueHint: false,
    },
    bordered: {
      type: "boolean",
      description: "Whether has border style",
      defaultValueHint: true,
    },
    disabled: {
      type: "boolean",
      description: "Whether the input is disabled",
      defaultValueHint: false,
    },
    id: {
      type: "string",
      description: "The ID for input",
    },
    maxLength: {
      type: "number",
      description: "The max length",
    },
    placeholder: {
      type: "string",
      description: "Placeholder for the input",
    },
    prefix: {
      type: "slot",
      hidePlaceholder: true,
    },
    size: {
      type: "choice",
      options: ["small", "middle", "large"],
      description: "The size of the input box",
      defaultValueHint: "middle",
    },
    type: {
      type: "string",
      description: "The type of input",
    },
    value: {
      type: "string",
    },
    visibilityToggle: {
      type: "boolean",
      description: "Whether show toggle button",
      defaultValueHint: true,
    },
    onChange: {
      type: "eventHandler",
      argTypes: [
        {
          name: "event",
          type: "object",
        },
      ],
    },
  }),
  states: {
    value: {
      type: "writable",
      variableType: "text",
      onChangeProp: "onChange",
      valueProp: "value",
    },
  },
  componentHelpers: inputHelpers,
  importPath: "antd/lib/input/Password",
  importName: "Password",
  isDefaultExport: true,
  parentComponentName: "AntdInput",
};

export function registerInputPassword(
  loader?: Registerable,
  customInputPasswordMeta?: ComponentMeta<PasswordProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Password, customInputPasswordMeta ?? inputPasswordMeta);
}

export const inputGroupMeta: ComponentMeta<GroupProps> = {
  name: "AntdInputGroup",
  displayName: "Antd Input Group",
  props: {
    compact: {
      type: "boolean",
      description: "Whether use compact style",
      defaultValueHint: false,
    },
    size: {
      type: "choice",
      options: ["small", "default", "large"],
      description:
        "The size of Input.Group specifies the size of the included Input fields",
      defaultValueHint: "default",
    },
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "component",
          name: "AntdInput",
        },
        {
          type: "component",
          name: "AntdInput",
        },
      ],
    },
  },
  importPath: "antd/lib/input/Group",
  importName: "InputGroup",
  isDefaultExport: true,
  parentComponentName: "AntdInput",
};

export function registerInputGroup(
  loader?: Registerable,
  customInputGroupMeta?: ComponentMeta<GroupProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(InputGroup, customInputGroupMeta ?? inputGroupMeta);
}
