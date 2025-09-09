import { ActionProps, ControlExtras, PropType } from "@plasmicapp/host";
import { ArrayType } from "@plasmicapp/host/registerComponent";
import { Input, InputNumber, Radio } from "antd";
import React from "react";
import { AntdCheckbox } from "../registerCheckbox";
import { AntdDatePicker } from "../registerDatePicker";
import { AntdRadioGroup } from "../registerRadio";
import { AntdSelect } from "../registerSelect";
import { arrayEq } from "../utils";
import {
  FormWrapperControlContextData,
  FormWrapperProps,
  InputType,
  SimplifiedFormItemsProp,
} from "./Form";
import { FormItemControlContextData, InternalFormItemProps } from "./FormItem";
import { CommonFormControlContextData } from "./contexts";

const mapAntdComponentToInputType = new Map<any, InputType>([
  [Input, InputType.Text],
  [Input.TextArea, InputType.TextArea],
  [Input.Password, InputType.Password],
  [InputNumber, InputType.Number],
  [AntdSelect, InputType.Select],
  [AntdRadioGroup, InputType.RadioGroup],
  [Radio, InputType.Radio],
  [AntdDatePicker, InputType.DatePicker],
  [AntdCheckbox, InputType.Checkbox],
]);

const mapPlumeTypeToInputType = new Map<string, InputType>([
  ["text-input", InputType.Text],
  ["select", InputType.Select],
  ["checkbox", InputType.Checkbox],
  ["switch", InputType.Checkbox],
]);

export const COMMON_ACTIONS = [
  {
    type: "button-action" as const,
    label: "Append new Form Field",
    onClick: ({ studioOps }: ActionProps<any>) => {
      studioOps.appendToSlot(
        {
          type: "component",
          name: "plasmic-antd5-form-item",
        },
        "children"
      );
    },
    hidden: (props: any) => props.mode !== "advanced",
  },
  // {
  //   type: "button-action" as const,
  //   label: "Append new Form Field Group",
  //   onClick: ({ studioOps }: ActionProps<any>) => {
  //     studioOps.appendToSlot(
  //       {
  //         type: "component",
  //         name: "plasmic-antd5-form-group",
  //       },
  //       "children"
  //     );
  //   },
  // },
  // {
  //   type: "button-action" as const,
  //   label: "Append new Form List",
  //   onClick: ({ studioOps }: ActionProps<any>) => {
  //     studioOps.appendToSlot(
  //       {
  //         type: "component",
  //         name: "plasmic-antd5-form-list",
  //       },
  //       "children"
  //     );
  //   },
  // },
];

export function getDefaultValueHint(field: keyof SimplifiedFormItemsProp) {
  return (
    _props: any,
    contextData:
      | FormWrapperControlContextData
      | FormItemControlContextData
      | null,
    { item }: any
  ): any => {
    if (!contextData || !("mergedFields" in contextData)) {
      return undefined;
    }
    if (item?.fieldId) {
      const fieldSetting = contextData.mergedFields?.find(
        (f) => f.fieldId === item.fieldId
      );
      return fieldSetting?.[field];
    }
    return undefined;
  };
}

export function commonFormItemProps(
  usage: "simplified-form-item"
): Record<string, PropType<InternalFormItemProps>>;
export function commonFormItemProps(
  usage: "advanced-form-item"
): Record<string, PropType<FormWrapperProps>>;
export function commonFormItemProps(
  usage: "simplified-form-item" | "advanced-form-item"
):
  | Record<string, PropType<FormWrapperProps>>
  | Record<string, PropType<InternalFormItemProps>> {
  const getFormItemProps = (
    ps: FormWrapperProps | InternalFormItemProps,
    _ctx: any,
    { item }: { item?: SimplifiedFormItemsProp }
  ): InternalFormItemProps | undefined => {
    if (usage === "simplified-form-item") {
      return item;
    } else {
      return ps as InternalFormItemProps;
    }
  };

  return {
    name: {
      type: "string" as const,
      required: true,
      displayName: "Field key",
      description: "Key name for this field value in the submitted form data.",
      validator: (
        value: string,
        _ps: any,
        ctx: CommonFormControlContextData | null
      ) => {
        let currFullPath: (string | number)[] = [];
        if (usage === "simplified-form-item") {
          currFullPath = [value];
        } else {
          const formItemCtx = ctx as FormItemControlContextData | null;
          currFullPath = [...(formItemCtx?.parentFormItemPath ?? []), value];
        }
        const nameCounter = (
          ctx?.internalFieldCtx?.registeredFields ?? []
        ).filter((formItem) => arrayEq(formItem.fullPath, currFullPath)).length;
        return nameCounter === 1
          ? true
          : `Repeated form field key: ${currFullPath.join(" → ")}`;
      },
      defaultValueHint: getDefaultValueHint("name"),
    },
    initialValue: {
      type: "dynamic",
      control: (
        ps: FormWrapperProps | InternalFormItemProps,
        ctx: FormWrapperControlContextData | null,
        {
          item,
          path,
        }: { item: SimplifiedFormItemsProp; path: (string | number)[] }
      ) => {
        let inputType = InputType.Unknown;
        if (usage === "simplified-form-item") {
          inputType = item.inputType;
          if (!(ps as FormWrapperProps).data) {
            inputType = item.inputType;
          } else if (path != null && typeof path[1] === "number") {
            inputType =
              ctx?.mergedFields?.[path[1]].inputType ?? InputType.Unknown;
          }
        } else {
          if (
            !React.isValidElement(ps.children) ||
            typeof ps.children.type === "string"
          ) {
            inputType = InputType.Unknown;
          } else {
            if (mapAntdComponentToInputType.has(ps.children.type)) {
              inputType =
                mapAntdComponentToInputType.get(ps.children.type) ??
                InputType.Unknown;
            } else if ("__plumeType" in ps.children.type) {
              inputType =
                mapPlumeTypeToInputType.get(
                  ps.children.type.__plumeType as string
                ) ?? InputType.Unknown;
            }
          }
        }
        if (
          [
            InputType.Text,
            InputType.TextArea,
            InputType.Password,
            InputType.Select,
            InputType.RadioGroup,
          ].includes(inputType)
        ) {
          return {
            type: "string",
            defaultValueHint: getDefaultValueHint("initialValue"),
          };
        } else if (InputType.Number === inputType) {
          return {
            type: "number",
            defaultValueHint: getDefaultValueHint("initialValue"),
          };
        } else if (InputType.Checkbox === inputType) {
          return {
            type: "boolean",
            defaultValueHint: getDefaultValueHint("initialValue"),
          };
        } else if (InputType.DatePicker === inputType) {
          return {
            type: "dateString",
            defaultValueHint: getDefaultValueHint("initialValue"),
          };
        } else {
          return {
            type: "exprEditor",
            defaultValueHint: getDefaultValueHint("initialValue"),
          };
        }
      },
    } as any,
    rules: {
      displayName: "Validation rules",
      type: "formValidationRules" as const,
    } as any,
    valuePropName: {
      type: "string" as const,
      advanced: true,
      defaultValueHint: "value",
      description:
        "The prop name for specifying the value of the form control component",
    },
    trigger: {
      type: "string" as const,
      displayName: "Trigger prop name",
      advanced: true,
      defaultValueHint: "onChange",
      description:
        "The prop name of event handler that is called when value is changed",
    },
    noLabel: {
      type: "boolean" as const,
      advanced: true,
    },
    alignLabellessWithControls: {
      type: "boolean" as const,
      displayName: "Align with controls?",
      description: "Aligns the content with form controls in the grid",
      hidden: (
        ps: any,
        ctx: CommonFormControlContextData | null,
        extras: ControlExtras
      ) => {
        const formItem = getFormItemProps(ps, ctx, extras);
        return !formItem?.noLabel || ctx?.layout?.layout !== "horizontal";
      },
      defaultValueHint: true,
    },
    colon: {
      type: "boolean" as const,
      defaultValueHint: true,
      advanced: true,
      hidden: () => true,
    },
    labelAlign: {
      type: "choice" as const,
      options: ["left", "right"],
      advanced: true,
      hidden: (
        ps: any,
        ctx: CommonFormControlContextData | null,
        extras: ControlExtras
      ) => {
        const formItem = getFormItemProps(ps, ctx, extras);
        return !!formItem?.noLabel || ctx?.layout?.layout !== "horizontal";
      },
    },
    hidden: {
      type: "boolean" as const,
      defaultValueHint: getDefaultValueHint("hidden"),
    },
    validateTrigger: {
      displayName: "Validate when",
      type: "choice",
      options: [
        { value: "onBlur", label: "a field loses focus" },
        { value: "onChange", label: "a field changes" },
        { value: "onSubmit", label: "the form is submitted" },
      ],
      multiSelect: true,
      defaultValueHint: ["onChange"],
      advanced: true,
    },
    shouldUpdate: {
      type: "boolean" as const,
      advanced: true,
      displayName: "Always re-render",
      description:
        "Form fields normally only re-render when the corresponding form value changes, for performance. This forces it to always re-render.",
    },
    dependencies: {
      type: "array" as const,
      advanced: true,
      displayName: "Dependencies",
      description:
        "Form fields can depend on other form fields. This forces it to re-evaluate the validation rules when the other form fields changes.",
    },
    hideValidationMessage: {
      type: "boolean" as const,
      displayName: "Hide validation message?",
      description: "If true, will hide the validation error message",
      defaultValueHint: false,
      advanced: true,
    },
    customizeProps: {
      type: "function" as const,
      description:
        "Customize the props passed into the wrapped field component. Takes the current status ('success', 'warning', 'error', or 'validating').)",
      argNames: ["fieldData"],
      argValues: (_ps: any, ctx: FormItemControlContextData) => [
        {
          status: ctx?.status?.status,
        },
      ],
      advanced: true,
    } as any,
    noStyle: {
      type: "boolean" as const,
      displayName: "Field control only",
      description:
        "Don't render anything but the field control - so no label, help text, validation error, etc.",
      advanced: true,
    },
    preserve: {
      type: "boolean" as const,
      advanced: true,
      defaultValueHint: true,
      description: "Keep field value even when field removed.",
    },
  };
}

export const commonSimplifiedFormArrayItemType = (
  propName: "formItems" | "dataFormItems"
): ArrayType<FormWrapperProps>["itemType"] => ({
  type: "object",
  fields: {
    label: {
      type: "string",
      defaultValueHint: getDefaultValueHint("label"),
    },
    inputType: {
      type: "choice",
      options: Object.values(InputType).filter(
        (inputType) =>
          ![
            InputType.Option,
            InputType.OptionGroup,
            InputType.Radio,
            InputType.Unknown,
          ].includes(inputType)
      ),
      defaultValue: InputType.Text,
      defaultValueHint: getDefaultValueHint("inputType"),
    },
    options: {
      type: "array",
      itemType: {
        type: "object",
        fields: {
          type: {
            type: "choice",
            options: [
              { value: "option", label: "Option" },
              { value: "option-group", label: "Option Group" },
            ],
            defaultValue: "option",
            hidden: (ps, _ctx, { path }) => {
              if (
                ps[propName]?.[path[1] as number]?.inputType !==
                InputType.Select
              ) {
                return true;
              }
              return false;
            },
          },
          label: "string",
          value: {
            type: "string",
            hidden: (ps, _ctx, { path, item }) => {
              if (
                ps[propName]?.[path[1] as number]?.inputType !==
                InputType.Select
              ) {
                return false;
              }
              return item.type !== "option";
            },
          },
          options: {
            type: "array",
            itemType: {
              type: "object",
              nameFunc: (item: any) => item.label || item.value,
              fields: {
                value: "string",
                label: "string",
              },
            },
            hidden: (ps, _ctx, { path, item }) => {
              if (
                ps[propName]?.[path[1] as number]?.inputType !==
                InputType.Select
              ) {
                return true;
              }
              return item.type !== "option-group";
            },
          },
        },
        nameFunc: (item) => item?.label,
      },
      hidden: (_ps: any, _ctx: any, { item }) =>
        ![InputType.Select, InputType.RadioGroup].includes(item.inputType),
    },
    optionType: {
      type: "choice",
      options: [
        { value: "default", label: "Radio" },
        { value: "button", label: "Button" },
      ],
      hidden: (_ps: any, _ctx: any, { item }) =>
        InputType.RadioGroup !== item.inputType,
      defaultValueHint: "Radio",
      displayName: "Option Type",
    },
    showTime: {
      type: "boolean",
      displayName: "Show Time",
      description: "To provide an additional time selection",
      hidden: (_ps: any, _ctx: any, { item }) =>
        ![InputType.DatePicker].includes(item.inputType),
    },
    ...commonFormItemProps("simplified-form-item"),
  },
  nameFunc: (item) => item.fieldId ?? item.label ?? item.name,
});
