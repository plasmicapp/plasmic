import {
  ActionProps,
  DataProvider,
  repeatedElement,
  usePlasmicCanvasContext,
} from "@plasmicapp/host";
import { Form } from "antd";
import type { FormInstance, FormProps } from "antd/es/form";
import type { FormItemProps } from "antd/es/form/FormItem";
import type { FormListOperation, FormListProps } from "antd/es/form/FormList";
import type { ColProps } from "antd/es/grid/col";
import equal from "fast-deep-equal";
import React, { cloneElement, isValidElement } from "react";
import { mergeProps } from "./react-utils";
import { Registerable, registerComponentHelper, usePrevious } from "./utils";

const reactNodeToString = function (reactNode: React.ReactNode): string {
  let string = "";
  if (typeof reactNode === "string") {
    string = reactNode;
  } else if (typeof reactNode === "number") {
    string = reactNode.toString();
  } else if (reactNode instanceof Array) {
    reactNode.forEach(function (child) {
      string += reactNodeToString(child);
    });
  } else if (isValidElement(reactNode)) {
    string += reactNodeToString(reactNode.props.children);
  }
  return string;
};

function ensureArray<T>(x: T | T[]): T[] {
  return Array.isArray(x) ? x : [x];
}

const FormItem = Form.Item;
const FormList = Form.List;

interface FormWrapperProps extends FormProps {
  /**
   * https://ant.design/components/form#setfieldsvalue-do-not-trigger-onfieldschange-or-onvalueschange
   * Because setFieldsValue doesn't trigger onValuesChange, we need to create our own onChange function.
   * This will allow us to trigger the onChange function and keep the value state updated in canvas.
   * We also don't invoke onValuesChange to avoid changing the standard behavior, since users may have
   * overridden this function in their codebase
   **/
  extendedOnValuesChange?: (
    values: Parameters<NonNullable<FormProps["onValuesChange"]>>[1]
  ) => void;
}

const PathContext = React.createContext<{
  relativePath: (string | number)[]; // used for form.items inside a form.list
  fullPath: (string | number)[];
}>({ relativePath: [], fullPath: [] });

interface InternalFormInstanceContextData {
  fireOnValuesChange: () => void;
  forceRemount: () => void;
  layout: FormLayoutContextValue;
}

const InternalFormInstanceContext = React.createContext<
  InternalFormInstanceContextData | undefined
>(undefined);

interface FormLayoutContextValue {
  layout: React.ComponentProps<typeof Form>["layout"];
  labelSpan?: number;
}

const FormLayoutContext = React.createContext<
  FormLayoutContextValue | undefined
>(undefined);

const Internal = (
  props: FormWrapperProps & {
    setRemountKey: React.Dispatch<React.SetStateAction<number>>;
    labelCol?: ColProps & { horizontalOnly?: boolean };
    wrapperCol?: ColProps & { horizontalOnly?: boolean };
  }
) => {
  const [form] = Form.useForm();
  const values = form.getFieldsValue(true);
  const lastValue = React.useRef(values);
  const { extendedOnValuesChange, setRemountKey, ...rest } = props;
  // extracted from https://github.com/react-component/field-form/blob/master/src/Form.tsx#L120
  const childrenNode =
    typeof props.children === "function"
      ? props.children(values, form)
      : props.children;

  const fireOnValuesChange = React.useCallback(() => {
    const values = form.getFieldsValue(true);
    if (!equal(values, lastValue.current)) {
      extendedOnValuesChange?.(values);
      lastValue.current = values;
    }
  }, [form, lastValue]);

  React.useEffect(() => {
    fireOnValuesChange();
  }, []);
  const formLayout = React.useMemo(
    () => ({
      layout: props.layout,
      labelSpan: props.labelCol?.span as number | undefined,
    }),
    [props.layout, props.labelCol?.span]
  );
  return (
    <InternalFormInstanceContext.Provider
      value={{
        layout: formLayout,
        fireOnValuesChange,
        forceRemount: () => setRemountKey((k) => k + 1),
      }}
    >
      <FormLayoutContext.Provider value={formLayout}>
        <Form
          {...rest}
          key={
            props.initialValues
              ? JSON.stringify(props.initialValues)
              : undefined
          }
          onValuesChange={(...args) => {
            props.onValuesChange?.(...args);
            extendedOnValuesChange?.(args[1]);
          }}
          form={form}
          labelCol={
            props.labelCol?.horizontalOnly && props.layout !== "horizontal"
              ? undefined
              : props.labelCol
          }
          wrapperCol={
            props.wrapperCol?.horizontalOnly && props.layout !== "horizontal"
              ? undefined
              : props.wrapperCol
          }
        >
          {/*Remove built-in spacing on form fields*/}
          <style>{`
          .ant-form-item-explain + div, .ant-form-item-margin-offset {
            display: none;
          }
          `}</style>
          {childrenNode}
        </Form>
      </FormLayoutContext.Provider>
    </InternalFormInstanceContext.Provider>
  );
};
export function FormWrapper(props: FormWrapperProps) {
  const [remountKey, setRemountKey] = React.useState(0);
  const previousInitialValues = usePrevious(props.initialValues);

  React.useEffect(() => {
    if (
      previousInitialValues !== props.initialValues &&
      JSON.stringify(previousInitialValues) !==
        JSON.stringify(props.initialValues)
    ) {
      setRemountKey((k) => k + 1);
    }
  }, [previousInitialValues, props.initialValues]);

  return <Internal key={remountKey} {...props} setRemountKey={setRemountKey} />;
}

const COMMON_ACTIONS = [
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
const colProp = (
  displayName?: string,
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
        description: "Only apply to horizontal layout",
      },
    },
    description,
    defaultValue: defaultValue,
  } as const);

export function registerForm(loader?: Registerable) {
  registerComponentHelper(loader, FormWrapper, {
    name: "plasmic-antd5-form",
    displayName: "Form",
    defaultStyles: {
      layout: "vbox",
      alignItems: "flex-start",
    },
    props: {
      children: {
        type: "slot",
        defaultValue: [
          {
            type: "component",
            name: "plasmic-antd5-form-item",
            props: {
              label: {
                type: "text",
                value: "Name",
              },
              name: "name",
              children: {
                type: "component",
                name: "plasmic-antd5-input",
              },
            },
          },
          {
            type: "component",
            name: "plasmic-antd5-form-item",
            props: {
              label: {
                type: "text",
                value: "Message",
              },
              name: "message",
              children: {
                type: "component",
                name: "plasmic-antd5-textarea",
              },
            },
          },
          {
            type: "component",
            name: "plasmic-antd5-form-item",
            props: {
              noLabel: true,
              children: {
                type: "component",
                name: "plasmic-antd5-button",
                props: {
                  children: {
                    type: "text",
                    value: "Submit",
                  },
                  type: "primary",
                  submitsForm: true,
                },
              },
            },
          },
        ],
      },
      initialValues: {
        type: "object",
      } as any,
      layout: {
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
        displayName: "Required/optional mark",
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
        type: "choice",
        options: ["onSubmit", "onChange", "onBlur"],
        multiSelect: true,
        defaultValueHint: ["onChange"],
        advanced: true,
      },
    },
    actions: COMMON_ACTIONS,
    states: {
      value: {
        type: "readonly",
        variableType: "object",
        onChangeProp: "extendedOnValuesChange",
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerForm",
    importName: "FormWrapper",
  });
}

interface FormControlContextData {
  internalFormCtx?: InternalFormInstanceContextData;
}

interface CuratedFieldData {
  status: string | undefined;
  // path: (string | number)[];
  // errors: string[];
  // warnings: string[];
  // value: any;
  // trigger: (x: any) => void;
}

interface InternalFormItemProps extends Omit<FormItemProps, "rules"> {
  rules?: PlasmicRule[];
  description?: React.ReactNode;
  noLabel?: boolean;
  hideValidationMessage?: boolean;
  customizeProps?: (
    fieldData: CuratedFieldData,
    props: InternalFormItemProps
  ) => FormItemProps;
  setControlContextData?: (data: FormControlContextData) => void;
  alignLabellessWithControls?: boolean;
}

interface PlasmicRule {
  ruleType:
    | "enum"
    | "len"
    | "max"
    | "min"
    | "regex"
    | "required"
    | "whitespace"
    | "advanced";
  length?: number;
  pattern?: string;
  custom?: (...args: any[]) => any;
  options?: { value: string }[];
  message?: string;
}

function plasmicRulesToAntdRules(
  plasmicRules: PlasmicRule[],
  label: string | undefined
) {
  const effectiveLabel = label || "This field";
  const rules: FormItemProps["rules"] = [];
  for (const plasmicRule of plasmicRules) {
    switch (plasmicRule.ruleType) {
      case "enum":
        rules.push({
          type: "enum",
          enum: plasmicRule.options?.map((opt) => opt.value) ?? [],
          message:
            plasmicRule.message ?? `${effectiveLabel} must be a valid value`,
        });
        break;
      case "required":
        rules.push({
          required: true,
          message: plasmicRule.message ?? `${effectiveLabel} is required`,
        });
        break;
      case "regex":
        rules.push({
          pattern: new RegExp(plasmicRule.pattern ?? ""),
          message:
            plasmicRule.message ?? `${effectiveLabel} must be a valid value`,
        });
        break;
      case "whitespace":
        rules.push({
          whitespace: true,
          message: plasmicRule.message ?? `${effectiveLabel} is required`,
        });
        break;
      case "min":
        rules.push({
          [plasmicRule.ruleType]: plasmicRule.length,
          message:
            plasmicRule.message ??
            `${effectiveLabel} must be at least ${plasmicRule.length} characters`,
        });
        break;
      case "max":
        rules.push({
          [plasmicRule.ruleType]: plasmicRule.length,
          message:
            plasmicRule.message ??
            `${effectiveLabel} must be at most ${plasmicRule.length} characters`,
        });
        break;
      case "advanced":
        rules.push({
          validator: (...args) =>
            plasmicRule.custom?.apply(null, args)
              ? Promise.resolve()
              : Promise.reject(),
          message: plasmicRule.message,
        });
    }
  }
  return rules;
}

const useFormItemRelativeName = (name: FormItemProps["name"]) => {
  const pathCtx = React.useContext(PathContext);
  return typeof name === "object"
    ? [...pathCtx.relativePath, ...name]
    : typeof name === "string"
    ? [...pathCtx.relativePath, name]
    : undefined;
};

const useFormItemFullName = (name: FormItemProps["name"]) => {
  const pathCtx = React.useContext(PathContext);
  return typeof name === "object"
    ? [...pathCtx.fullPath, ...name]
    : typeof name === "string"
    ? [...pathCtx.fullPath, name]
    : undefined;
};

function useFormInstanceMaybe(): FormInstance<any> | undefined {
  return Form.useFormInstance();
}

export function FormItemWrapper(props: InternalFormItemProps) {
  const {
    rules: plasmicRules,
    description,
    noLabel,
    name,
    hideValidationMessage,
    customizeProps,
    setControlContextData,
    alignLabellessWithControls = true,
    ...rest
  } = props;
  const relativeFormItemName = useFormItemRelativeName(name);
  const fullFormItemName = useFormItemFullName(name);
  const bestEffortLabel =
    (!noLabel && reactNodeToString(props.label)) ||
    ensureArray(props.name).slice(-1)[0];
  const rules = plasmicRules
    ? plasmicRulesToAntdRules(
        plasmicRules,
        typeof bestEffortLabel === "number"
          ? "" + bestEffortLabel
          : bestEffortLabel
      )
    : undefined;
  const layoutContext = React.useContext(FormLayoutContext);
  const inCanvas = !!usePlasmicCanvasContext();
  if (inCanvas) {
    const form = useFormInstanceMaybe();
    const prevPropValues = React.useRef({
      initialValue: props.initialValue,
      name: props.name,
    });
    const internalFormCtx = React.useContext(InternalFormInstanceContext);
    const { fireOnValuesChange, forceRemount } = internalFormCtx ?? {};
    props.setControlContextData?.({
      internalFormCtx,
    });
    React.useEffect(() => {
      if (prevPropValues.current.name !== props.name) {
        forceRemount?.();
      }
      if (
        !fullFormItemName ||
        form?.getFieldValue(fullFormItemName) !==
          prevPropValues.current.initialValue
      ) {
        // this field value is set at the form level
        return;
      }
      form?.setFieldValue(fullFormItemName, props.initialValue);
      prevPropValues.current.initialValue = props.initialValue;
      fireOnValuesChange?.();
    }, [form, props.initialValue, fullFormItemName]);
  }
  return (
    <FormItem
      {...rest}
      label={noLabel ? undefined : props.label}
      name={relativeFormItemName}
      rules={rules}
      extra={description}
      help={hideValidationMessage ? "" : props.help}
      colon={noLabel ? false : undefined}
      valuePropName={deriveValuePropName(props)}
      // If in horizontal mode and no label, then we align the content
      // with the rest of the controls in the grid
      // if alignLabellessWithControls is true
      wrapperCol={
        layoutContext?.layout === "horizontal" &&
        noLabel &&
        alignLabellessWithControls &&
        layoutContext.labelSpan
          ? { offset: layoutContext.labelSpan }
          : undefined
      }
    >
      <FormItemForwarder formItemProps={props} />
    </FormItem>
  );
}

/**
 * Derive the valuePropName to use, if the wrapped child has designated
 * one via its Component.__plasmicFormFieldMeta?.valueProp.
 */
function deriveValuePropName(props: InternalFormItemProps): string | undefined {
  if (props.valuePropName) {
    // Always prefer an explicitly specified valuePropName
    return props.valuePropName;
  }

  const valueProps = React.Children.map(props.children as any, (child) => {
    if (React.isValidElement(child)) {
      const childType = child.type;
      if (childType) {
        const x = (childType as any).__plasmicFormFieldMeta?.valueProp;
        if (x) {
          return x as string;
        }
        // Hard-coding "isChecked" for Plume checkbox / switch
        const plumeType = (childType as any).__plumeType;
        if (plumeType && (plumeType === "checkbox" || plumeType === "switch")) {
          return "isChecked";
        }
      }
    }
    return undefined;
  }).filter((x: any): x is string => !!x);
  if (valueProps.length > 0) {
    return valueProps[0];
  }
  return undefined;
}

function FormItemForwarder({ formItemProps, ...props }: any) {
  const status = Form.Item.useStatus();
  const internalFormCtx = React.useContext(InternalFormInstanceContext);
  // const value = props[formItemProps.valuePropName ?? "value"];
  // const trigger = props[formItemProps.trigger ?? "onChange"];
  const data: CuratedFieldData = {
    status: status.status,
  };
  props.setControlContextData?.({
    internalFormCtx,
    status,
  });
  return React.Children.map(formItemProps.children, (child, i) => {
    let newProps = {
      ...(child.props ?? {}),
      ...props,
      __plasmicFormField: true,
    };
    if (formItemProps.customizeProps) {
      newProps = mergeProps(
        newProps,
        formItemProps.customizeProps(data, newProps)
      );
    }
    return i === 0 && isValidElement(child)
      ? cloneElement(child, newProps)
      : child;
  });
}

export function registerFormItem(loader?: Registerable) {
  registerComponentHelper(loader, FormItemWrapper, {
    name: "plasmic-antd5-form-item",
    displayName: "Form Field",
    parentComponentName: "plasmic-antd5-form",
    defaultStyles: {
      marginBottom: "24px",
      width: "stretch",
    },
    props: {
      label: {
        type: "slot",
        defaultValue: {
          type: "text",
          value: "Label",
        },
        hidden: (ps) => !!ps.noLabel,
        ...({ mergeWithParent: true } as any),
      },
      children: {
        type: "slot",
        defaultValue: {
          type: "component",
          name: "plasmic-antd5-input",
        },
        ...({ mergeWithParent: true } as any),
      },
      name: {
        type: "string",
      },
      initialValue: {
        type: "string",
      },
      rules: {
        type: "formValidationRules",
      } as any,
      valuePropName: {
        type: "string",
        advanced: true,
        defaultValueHint: "value",
        description:
          "If you are using a custom control whose prop for the value is not `value`, then specify the right prop name to use here.",
      },
      noLabel: {
        type: "boolean",
        advanced: true,
      },
      alignLabellessWithControls: {
        type: "boolean",
        displayName: "Align with controls?",
        description: "Aligns the content with form controls in the grid",
        hidden: (ps, ctx) =>
          !ps.noLabel || ctx?.internalFormCtx?.layout.layout !== "horizontal",
        defaultValueHint: true,
      },
      colon: {
        type: "boolean",
        defaultValueHint: true,
        advanced: true,
        hidden: () => true,
      },
      labelAlign: {
        type: "choice",
        options: ["left", "right"],
        advanced: true,
        hidden: (ps, ctx) =>
          !!ps.noLabel || ctx?.internalFormCtx?.layout.layout !== "horizontal",
      },
      hidden: {
        type: "boolean",
        advanced: true,
      },
      validateTrigger: {
        type: "choice",
        options: ["onSubmit", "onChange", "onBlur"],
        multiSelect: true,
        advanced: true,
      },
      shouldUpdate: {
        type: "boolean",
        advanced: true,
        displayName: "Always re-render",
        description:
          "Form fields normally only re-render when the corresponding form value changes, for performance. This forces it to always re-render.",
      },
      dependencies: {
        type: "array",
        advanced: true,
        displayName: "Dependencies",
        description:
          "Form fields can depend on other form fields. This forces it to reevaluate the validation rules when the other form field changes.",
      },
      hideValidationMessage: {
        type: "boolean",
        displayName: "Hide validation message?",
        description: "If true, will hide the validation error message",
        defaultValueHint: false,
        advanced: true,
      },
      description: {
        type: "slot",
        hidePlaceholder: true,
      },
      customizeProps: {
        type: "function",
        description:
          "Customize the props passed into the wrapped field component. Takes the current status ('success', 'warning', 'error', or 'validating').)",
        argNames: ["fieldData"],
        argValues: (_ps: any, ctx: any) => [
          {
            status: ctx?.status?.status,
          },
        ],
        advanced: true,
      } as any,
      noStyle: {
        type: "boolean",
        displayName: "Field control only",
        description:
          "Don't render anything but the field control - so no label, help text, validation error, etc.",
        advanced: true,
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerForm",
    importName: "FormItemWrapper",
    templates: {
      Text: {
        props: {
          children: {
            type: "component",
            name: "plasmic-antd5-input",
          },
        },
      },
      "Long Text": {
        props: {
          children: {
            type: "component",
            name: "plasmic-antd5-textarea",
          },
        },
      },
      "Select dropdown": {
        props: {
          children: {
            type: "component",
            name: "plasmic-antd5-select",
          },
        },
      },
      Number: {
        props: {
          children: {
            type: "component",
            name: "plasmic-antd5-input-number",
          },
        },
      },
      Checkbox: {
        props: {
          children: {
            type: "component",
            name: "plasmic-antd5-checkbox",
          },
          noLabel: true,
        },
      },
      Switch: {
        props: {
          children: {
            type: "component",
            name: "plasmic-antd5-switch",
          },
          noLabel: true,
        },
      },
      Radios: {
        props: {
          children: {
            type: "component",
            name: "plasmic-antd5-radio-group",
          },
        },
      },
      Password: {
        props: {
          children: {
            type: "component",
            name: "plasmic-antd5-input-password",
          },
        },
      },
      "Submit button": {
        props: {
          children: {
            type: "component",
            name: "plasmic-antd5-button",
            props: {
              type: "primary",
            },
          },
          noLabel: true,
        },
      },
    },
    ...({ trapsSelection: true } as any),
  });
}

export interface FormGroupProps {
  name: string;
  children: React.ReactNode;
}

export function FormGroup(props: FormGroupProps) {
  const pathCtx = React.useContext(PathContext);
  return (
    <PathContext.Provider
      value={{
        relativePath: [...pathCtx.relativePath, props.name],
        fullPath: [...pathCtx.fullPath, props.name],
      }}
    >
      {props.children}
    </PathContext.Provider>
  );
}

export function registerFormGroup(loader?: Registerable) {
  registerComponentHelper(loader, FormGroup, {
    name: "plasmic-antd5-form-group",
    displayName: "Form Field Group",
    parentComponentName: "plasmic-antd5-form",
    actions: COMMON_ACTIONS,
    props: {
      name: {
        type: "string",
      },
      children: {
        type: "slot",
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerForm",
    importName: "FormGroup",
  });
}

type FormListWrapperProps = FormListProps & {
  children: React.ReactNode;
};

type FormListRenderFuncParams = Parameters<FormListProps["children"]>;

export const FormListWrapper = React.forwardRef(function FormListWrapper(
  props: FormListWrapperProps,
  ref: React.Ref<FormListOperation>
) {
  const relativeFormItemName = useFormItemRelativeName(props.name);
  const fullFormItemName = useFormItemFullName(props.name);
  const operationsRef = React.useRef<FormListRenderFuncParams | undefined>(
    undefined
  );
  React.useImperativeHandle(
    ref,
    () => ({
      add(defaultValue, insertIndex) {
        if (operationsRef.current) {
          const { add } = operationsRef.current[1];
          add(defaultValue, insertIndex);
        }
      },
      remove(index) {
        if (operationsRef.current) {
          const { remove } = operationsRef.current[1];
          remove(index);
        }
      },
      move(from, to) {
        if (operationsRef.current) {
          const { move } = operationsRef.current[1];
          move(from, to);
        }
      },
    }),
    [operationsRef]
  );
  const inCanvas = !!usePlasmicCanvasContext();
  if (inCanvas) {
    const form = useFormInstanceMaybe();
    const prevPropValues = React.useRef({
      initialValue: props.initialValue,
      name: props.name,
    });
    const { fireOnValuesChange, forceRemount } =
      React.useContext(InternalFormInstanceContext) ?? {};
    React.useEffect(() => {
      if (prevPropValues.current.name !== props.name) {
        forceRemount?.();
      }
      if (fullFormItemName) {
        form?.setFieldValue(fullFormItemName, props.initialValue);
        prevPropValues.current.initialValue = props.initialValue;
        fireOnValuesChange?.();
      }
    }, [props.initialValue, fullFormItemName]);
  }
  return (
    <FormList {...props} name={relativeFormItemName ?? []}>
      {(...args) => {
        operationsRef.current = args;
        return args[0].map((field, index) => (
          <PathContext.Provider
            value={{
              relativePath: [field.name],
              fullPath: [...(fullFormItemName ?? []), field.name],
            }}
          >
            <DataProvider name={"currentField"} data={field}>
              <DataProvider name={"currentFieldIndex"} data={index}>
                {repeatedElement(index, props.children)}
              </DataProvider>
            </DataProvider>
          </PathContext.Provider>
        ));
      }}
    </FormList>
  );
});

export function registerFormList(loader?: Registerable) {
  registerComponentHelper(loader, FormListWrapper, {
    name: "plasmic-antd5-form-list",
    parentComponentName: "plasmic-antd5-form",
    displayName: "Form List",
    actions: COMMON_ACTIONS,
    props: {
      children: {
        type: "slot",
        defaultValue: [
          {
            type: "hbox",
            children: [
              {
                type: "component",
                name: "plasmic-antd5-form-item",
                props: {
                  name: "firstName",
                  label: {
                    type: "text",
                    value: "First name",
                  },
                  children: {
                    type: "component",
                    name: "plasmic-antd5-input",
                  },
                },
              },
              {
                type: "component",
                name: "plasmic-antd5-form-item",
                props: {
                  name: "lastName",
                  label: {
                    type: "text",
                    value: "Last name",
                  },
                  children: {
                    type: "component",
                    name: "plasmic-antd5-input",
                  },
                },
              },
            ],
          },
        ],
      },
      name: {
        type: "string",
        defaultValue: "guests",
      },
      initialValue: {
        type: "array",
        defaultValue: [
          {
            firstName: "Jane",
            lastName: "Doe",
          },
          {
            firstName: "John",
            lastName: "Smith",
          },
        ],
      } as any,
    },
    refActions: {
      add: {
        displayName: "Add an item",
        argTypes: [
          {
            name: "defaultValue",
            displayName: "Default value",
            type: "object",
          },
          {
            name: "insertIndex",
            displayName: "Insert index",
            type: "number",
          },
        ],
      },
      remove: {
        displayName: "Remove an item",
        argTypes: [
          {
            name: "index",
            displayName: "Index",
            type: "number",
          },
        ],
      },
      move: {
        displayName: "Move field",
        argTypes: [
          {
            name: "from",
            displayName: "From",
            type: "number",
          },
          {
            name: "to",
            displayName: "To",
            type: "number",
          },
        ],
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerForm",
    importName: "FormListWrapper",
  });
}
