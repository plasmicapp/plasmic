import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Input, InputProps } from "antd";
import {
  GroupProps,
  PasswordProps,
  SearchProps,
  TextAreaProps,
} from "antd/lib/input";
import InputGroup from "antd/lib/input/Group";
import Password from "antd/lib/input/Password";
import Search from "antd/lib/input/Search";
import TextArea from "antd/lib/input/TextArea";
import { Registerable } from "./registerable";

export const inputMeta: ComponentMeta<InputProps> = {
  name: "AntdInput",
  displayName: "Antd Input",
  props: {
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
    },
    bordered: {
      type: "boolean",
      description: "Whether has border style",
    },
    disabled: {
      type: "boolean",
      description: "Whether the input is disabled",
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
      editOnly: true,
      uncontrolledProp: "defaultValue",
    },
  },
  importPath: "antd",
  importName: "Input",
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
  props: {
    allowClear: {
      type: "boolean",
      description: "If allow to remove input content with clear icon",
    },
    autoSize: {
      type: "object",
      description:
        "Height autosize feature, can be set to true | false or an object { minRows: 2, maxRows: 6 }",
    },
    disabled: {
      type: "boolean",
      description: "Whether the input is disabled",
    },
    bordered: {
      type: "boolean",
      description: "Whether has border style",
    },
    showCount: {
      type: "boolean",
      description: "Whether show text count",
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
      editOnly: true,
      uncontrolledProp: "defaultValue",
    },
  },
  importPath: "antd/lib/input/TextArea",
  importName: "TextArea",
  isDefaultExport: true,
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
  props: {
    addonBefore: {
      type: "slot",
      hidePlaceholder: true,
    },
    allowClear: {
      type: "boolean",
      description: "If allow to remove input content with clear icon",
    },
    bordered: {
      type: "boolean",
      description: "Whether has border style",
    },
    disabled: {
      type: "boolean",
      description: "Whether the input is disabled",
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
      editOnly: true,
      uncontrolledProp: "defaultValue",
    },
  },
  importPath: "antd/lib/input/Search",
  importName: "Search",
  isDefaultExport: true,
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
  props: {
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
    },
    bordered: {
      type: "boolean",
      description: "Whether has border style",
    },
    disabled: {
      type: "boolean",
      description: "Whether the input is disabled",
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
    },
    type: {
      type: "string",
      description: "The type of input",
    },
    value: {
      type: "string",
      editOnly: true,
      uncontrolledProp: "defaultValue",
    },
    visibilityToggle: {
      type: "boolean",
      description: "Whether show toggle button",
    },
  },
  importPath: "antd/lib/input/Password",
  importName: "Password",
  isDefaultExport: true,
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
    },
    size: {
      type: "choice",
      options: ["small", "default", "large"],
      description:
        "The size of Input.Group specifies the size of the included Input fields",
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
};

export function registerInputGroup(
  loader?: Registerable,
  customInputGroupMeta?: ComponentMeta<GroupProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(InputGroup, customInputGroupMeta ?? inputGroupMeta);
}
