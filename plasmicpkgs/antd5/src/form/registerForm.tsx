import { buttonComponentName, formComponentName } from "../names";
import { Registerable, registerComponentHelper } from "../utils";
import { FormWrapperProps, InputType, formHelpers } from "./Form";
import { FormWrapper } from "./SchemaForm";
import {
  COMMON_ACTIONS,
  commonSimplifiedFormArrayItemType,
} from "./sharedRegistration";

const colProp = (
  displayName: string,
  defaultValue?: object,
  description?: string
) =>
  ({
    type: "object",
    displayName: displayName,
    advanced: true,
    fields: {
      span: {
        type: "number",
        displayName: "Width",
        description:
          "The number of grid columns to span in width (out of 24 columns total)",
        min: 1,
        max: 24,
      },
      offset: {
        type: "number",
        displayName: "Offset",
        description:
          "Number of grid columns to skip from the left (out of 24 columns total)",
        min: 0,
        max: 23,
      },
      horizontalOnly: {
        type: "boolean",
        displayName: "Horizontal only",
        description: "Only apply when form layout is horizontal",
      },
    },
    nameFunc: () => `Edit ${displayName}`,
    description,
    defaultValue: defaultValue,
  } as const);

export const formTypeDescription = `
  You can create form with two different behaviors:
  \n\n
  1. Create a new entry: The form will be created empty and it will create a new row when submitted.
  2. Update an entry: The form will be pre-filled with the row values and it will update the table entry when submitted.
  \n\n
  For both options, you can customize later.
`;

export function registerForm(loader?: Registerable) {
  registerComponentHelper(loader, FormWrapper, {
    name: formComponentName,
    displayName: "Form",
    description:
      "[Learn how to use forms](https://docs.plasmic.app/learn/forms/)",
    defaultStyles: {
      layout: "vbox",
      alignItems: "flex-start",
    },
    props: {
      mode: {
        type: "controlMode",
        defaultValue: "simplified",
      } as any,
      data: {
        type: "formDataConnection",
        disableDynamicValue: true,
        disableLinkToProp: true,
        hidden: (ps: FormWrapperProps) => ps.mode !== "simplified" || !ps.data,
        invariantable: true,
      } as any,
      formItems: {
        displayName: "Fields",
        type: "array",
        itemType: commonSimplifiedFormArrayItemType("formItems"),
        defaultValue: [
          {
            label: "Name",
            name: "name",
            inputType: InputType.Text,
          },
          {
            label: "Message",
            name: "message",
            inputType: InputType.TextArea,
          },
        ],
        hidden: (ps) => {
          if (ps.mode === "advanced") {
            return true;
          }
          return !!ps.data;
        },
        invariantable: true,
      },
      /**
       * dataFormItems are used to expand the form items from schema forms.
       * We can't use the formItems prop because it has a default value. Therefore, if we unset the formItems prop,
       * we would end up with the default value of formItems + schema form items.
       * Ideally, we would need to support dynamic default value.
       */
      dataFormItems: {
        displayName: "Data Fields",
        type: "array",
        itemType: commonSimplifiedFormArrayItemType("dataFormItems"),
        hidden: (ps) => {
          if (ps.mode === "advanced") {
            return true;
          }
          return !ps.data;
        },
        unstable__keyFunc: (x) => x.key,
        unstable__minimalValue: (ps, contextData) => {
          return ps.data ? contextData?.minimalFullLengthFields : undefined;
        },
        unstable__canDelete: (item, ps, ctx) => {
          if (ps.mode !== "simplified") {
            return true;
          }
          if (!ctx?.schema || Object.keys(ctx.schema).length === 0) {
            // still loading...
            return false;
          }
          if (
            item.fieldId &&
            ctx.schema.fields?.some((f) => f.id === item.fieldId)
          ) {
            return false;
          }
          return true;
        },
        invariantable: true,
      },
      submitSlot: {
        type: "slot",
        hidden: () => true,
        defaultValue: {
          type: "component",
          name: buttonComponentName,
          props: {
            type: "primary",
            submitsForm: true,
            children: {
              type: "text",
              value: "Submit",
            },
          },
        },
        ...{
          mergeWithParent: () => true,
          hiddenMergedProps: (ps: any) => !ps.mode,
        },
      },
      children: {
        type: "slot",
        hidden: (props) => props.mode !== "advanced",
      },
      initialValues: {
        displayName: "Initial field values",
        type: "object",
      } as any,
      layout: {
        displayName: "Form layout",
        type: "choice",
        options: ["horizontal", "vertical", "inline"],
        defaultValue: "vertical",
      },
      labelAlign: {
        type: "choice",
        options: ["left", "right"],
        defaultValueHint: "right",
        advanced: true,
        hidden: (ps) => ps.layout !== "horizontal",
      },
      labelCol: colProp(
        "Label layout",
        {
          span: 8,
          horizontalOnly: true,
        },
        "Set the width and offset of the labels"
      ),
      wrapperCol: colProp(
        "Control layout",
        {
          span: 16,
          horizontalOnly: true,
        },
        "Set the width and offset of the form controls"
      ),
      colon: {
        type: "boolean",
        description: `Show a colon after labels by default (only for horizontal layout)`,
        defaultValueHint: true,
        advanced: true,
        hidden: (props) => (props.layout ?? "horizontal") !== "horizontal",
      },
      requiredMark: {
        displayName: "Required/optional indicators",
        type: "choice",
        options: [
          {
            value: "optional",
            label: "Indicate optional fields",
          },
          {
            value: true,
            label: "Indicate required fields with asterisk",
          },
          {
            value: false,
            label: "Show no indicators",
          },
        ],
        advanced: true,
        defaultValueHint: true,
      },
      extendedOnValuesChange: {
        type: "eventHandler",
        displayName: "On values change",
        argTypes: [
          {
            name: "changedValues",
            type: "object",
          },
          {
            name: "allValues",
            type: "object",
          },
        ],
      },
      onFinish: {
        type: "eventHandler",
        displayName: "On submit",
        argTypes: [
          {
            name: "values",
            type: "object",
          },
        ],
      },
      onFinishFailed: {
        // function({ values, errorFields, outOfDate })
        type: "eventHandler",
        displayName: "On invalid submit",
        argTypes: [
          {
            name: "data",
            type: "object",
          },
        ],
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
      autoDisableWhileSubmitting: {
        displayName: "Auto disable while submitting",
        type: "boolean",
        defaultValueHint: true,
        advanced: true,
        description:
          "When disabled, it allows the creation of new submissions even while existing submissions are in progress.",
      },
      onIsSubmittingChange: {
        type: "eventHandler",
        displayName: "On Is Submitting Change",
        argTypes: [
          {
            name: "isSubmitting",
            type: "boolean",
          },
        ],
        advanced: true,
      },
    },
    actions: [
      ...COMMON_ACTIONS,
      {
        type: "form-schema",
        hidden: (ps: FormWrapperProps) => ps.mode !== "simplified" || !!ps.data,
      } as any,
    ],
    states: {
      value: {
        type: "readonly",
        variableType: "object",
        onChangeProp: "extendedOnValuesChange",
      },
      isSubmitting: {
        type: "readonly",
        variableType: "boolean",
        onChangeProp: "onIsSubmittingChange",
        initVal: false,
      },
    },
    componentHelpers: {
      helpers: formHelpers,
      importName: "formHelpers",
      importPath: "@plasmicpkgs/antd5/skinny/Form",
    },
    refActions: {
      setFieldsValue: {
        displayName: "Set multiple fields",
        argTypes: [
          {
            name: "newValues",
            displayName: "New Values",
            type: "exprEditor",
          },
        ],
      },
      setFieldValue: {
        displayName: "Set field",
        argTypes: [
          {
            name: "namePath",
            displayName: "Name Path",
            type: {
              type: "dataSelector",
              data: (_, ctx) => {
                if (!ctx?.formInstance) {
                  return {};
                }
                return ctx.formInstance.getFieldsValue(true);
              },
            },
          },
          {
            name: "value",
            displayName: "New Value",
            type: "exprEditor",
          },
        ],
      },
      resetFields: {
        displayName: "Reset fields to initial value",
        argTypes: [],
      },
      clearFields: {
        displayName: "Clear fields",
        argTypes: [],
      },
      validateFields: {
        displayName: "Validate fields",
        argTypes: [
          {
            name: "nameList",
            displayName: "Name List",
            type: "object",
          },
          {
            name: "options",
            displayName: "Options",
            type: "object",
          },
        ],
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/SchemaForm",
    importName: "FormWrapper",
  });
}

// To maintain backward compatibility, we need to continue exporting these components,
// which were previously imported from "@plasmicpkgs/antd5/skinny/registerForm."
export { FormGroup } from "./FormGroup";
export { FormItemWrapper } from "./FormItem";
export { FormListWrapper } from "./FormList";
export { FormWrapper, formHelpers };
