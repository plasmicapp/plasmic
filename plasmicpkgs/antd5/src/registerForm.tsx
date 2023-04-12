import {
  ActionProps,
  DataProvider,
  repeatedElement,
  usePlasmicCanvasContext,
} from "@plasmicapp/host";
import Form, { FormInstance, FormProps } from "antd/es/form";
import FormItem, { FormItemProps } from "antd/es/form/FormItem";
import FormList, {
  FormListOperation,
  FormListProps,
} from "antd/es/form/FormList";
import { ColProps } from "antd/es/grid/col";
import equal from "fast-deep-equal";
import React, { cloneElement, isValidElement } from "react";
import { mergeProps } from "./react-utils";
import { omit, Registerable, registerComponentHelper } from "./utils";

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
  formProps: FormProps;
}

const InternalFormInstanceContext = React.createContext<
  InternalFormInstanceContextData | undefined
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
  // extracted from https://github.com/react-component/field-form/blob/master/src/Form.tsx#L120
  const childrenNode =
    typeof props.children === "function"
      ? props.children(values, form)
      : props.children;

  const fireOnValuesChange = () => {
    const values = form.getFieldsValue(true);
    if (!equal(values, lastValue.current)) {
      props.extendedOnValuesChange?.(values);
      lastValue.current = values;
    }
  };

  React.useEffect(() => {
    fireOnValuesChange();
  }, []);
  return (
    <InternalFormInstanceContext.Provider
      value={{
        fireOnValuesChange,
        forceRemount: () => props.setRemountKey((k) => k + 1),
        formProps: props,
      }}
    >
      <Form
        {...props}
        onValuesChange={(...args) => {
          props.onValuesChange?.(...args);
          props.extendedOnValuesChange?.(args[1]);
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
        {/*Remove built-in spacing on form items*/}
        <style>{`
        .ant-form-item-explain + div {
          display: none;
        }
        `}</style>
        {childrenNode}
      </Form>
    </InternalFormInstanceContext.Provider>
  );
};
function FormWrapper(props: FormWrapperProps) {
  const [remountKey, setRemountKey] = React.useState(0);
  return <Internal key={remountKey} {...props} setRemountKey={setRemountKey} />;
}

const COMMON_ACTIONS = [
  {
    type: "button-action" as const,
    label: "Append new Form Item",
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
  //   label: "Append new Form Group",
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

export function registerForm(loader?: Registerable) {
  const colProp = (displayName?: string, defaultValue?: {}) =>
    ({
      type: "object",
      displayName: displayName,
      advanced: true,
      fields: {
        span: {
          type: "number",
          displayName: "Grid columns",
          description:
            "The number of grid columns to span (24 columns available)",
          min: 1,
          max: 24,
        },
        offset: {
          type: "number",
          displayName: "Offset columns",
          description: "Number of grid columns to skip from the left",
          min: 0,
          max: 23,
        },
        horizontalOnly: {
          type: "boolean",
          displayName: "Horizontal only",
          description: "Only apply to horizontal layout",
        },
      },
      defaultValue: defaultValue,
    } as const);
  registerComponentHelper(loader, FormWrapper, {
    name: "plasmic-antd5-form",
    displayName: "Form",
    defaultStyles: {
      display: "plasmic-content-layout",
      gridRowGap: "10px",
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
            name: "plasmic-antd5-button",
            props: {
              children: {
                type: "text",
                value: "Submit",
              },
            },
          },
        ],
      },
      initialValues: {
        type: "object",
        forceRemount: true,
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
      },
      labelCol: colProp("Label layout", {
        span: 8,
        horizontalOnly: true,
      }),
      wrapperCol: colProp("Field layout", {
        span: 16,
        horizontalOnly: true,
      }),
      colon: {
        type: "boolean",
        description: `Show a colon after the label by default (only for horizontal layout)`,
        defaultValueHint: true,
        advanced: true,
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
    importName: "Form",
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
  rules: PlasmicRule[];
  helpTextMode?: string;
  noLabel?: boolean;
  customizeProps?: (
    fieldData: CuratedFieldData,
    props: InternalFormItemProps
  ) => FormItemProps;
  setControlContextData?: (data: FormControlContextData) => void;
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

function plasmicRulesToAntdRules(plasmicRules: PlasmicRule[]) {
  const rules: FormItemProps["rules"] = [];
  for (const plasmicRule of plasmicRules) {
    switch (plasmicRule.ruleType) {
      case "enum":
        rules.push({
          type: "enum",
          enum: plasmicRule.options?.map((opt) => opt.value) ?? [],
          message: plasmicRule.message,
        });
        break;
      case "required":
        rules.push({
          required: true,
          message: plasmicRule.message,
        });
        break;
      case "regex":
        rules.push({
          pattern: new RegExp(plasmicRule.pattern ?? ""),
          message: plasmicRule.message,
        });
        break;
      case "whitespace":
        rules.push({
          whitespace: true,
          message: plasmicRule.message,
        });
        break;
      case "min":
      case "max":
        rules.push({
          [plasmicRule.ruleType]: plasmicRule.length,
          message: plasmicRule.message,
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

function FormItemWrapper(props: InternalFormItemProps) {
  const relativeFormItemName = useFormItemRelativeName(props.name);
  const fullFormItemName = useFormItemFullName(props.name);
  const rules = props.rules ? plasmicRulesToAntdRules(props.rules) : undefined;

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
      {...omit(props, "rules")}
      label={props.noLabel ? undefined : props.label}
      name={relativeFormItemName}
      rules={rules}
      {...(props.helpTextMode === "extra"
        ? { extra: props.help }
        : props.helpTextMode === "help"
        ? // Never show validation errors in this mode, even if user didn't specify help
          { help: props.help ?? "" }
        : {})}
    >
      {props.customizeProps ? (
        <FormItemForwarder formItemProps={props} />
      ) : (
        props.children
      )}
    </FormItem>
  );
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
    const baseProps = { ...(child.props ?? {}), ...props };
    return i === 0 && isValidElement(child)
      ? cloneElement(
          child,
          mergeProps(baseProps, formItemProps.customizeProps(data, baseProps))
        )
      : child;
  });
}

export function registerFormItem(loader?: Registerable) {
  registerComponentHelper(loader, FormItemWrapper, {
    name: "plasmic-antd5-form-item",
    displayName: "Form Item",
    parentComponentName: "plasmic-antd5-form",
    props: {
      label: {
        type: "slot",
        defaultValue: {
          type: "text",
          value: "Label",
        },
      },
      children: {
        type: "slot",
        defaultValue: {
          type: "component",
          name: "plasmic-antd5-input",
        },
      },
      name: {
        type: "string",
      },
      initialValue: {
        type: "string",
      },
      required: {
        type: "boolean",
      },
      rules: {
        type: "formValidationRules",
      } as any,
      noLabel: {
        type: "boolean",
        advanced: true,
      },
      colon: {
        type: "boolean",
        defaultValueHint: (_ps: InternalFormItemProps, ctx: any) =>
          (ctx as FormControlContextData)?.internalFormCtx?.formProps.colon ??
          true,
        advanced: true,
      },
      labelAlign: {
        type: "choice",
        options: ["left", "right"],
        advanced: true,
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
          "Form items normally only re-render when the corresponding form value changes, for performance. This forces it to always re-render.",
      },
      helpTextMode: {
        type: "choice",
        displayName: "Help text",
        options: [
          {
            value: "errors",
            label: "Validation errors",
          },
          {
            value: "extra",
            label: "Custom help text and validation errors",
          },
          {
            value: "help",
            label: "Custom help text, no validation errors",
          },
        ],
        defaultValueHint: "Show validation errors",
        description:
          "What to show in the help text. Edit help text by editing the 'help' slot in the outline.",
      },
      help: {
        type: "slot",
        hidden: (ps) => !["extra", "help"].includes(ps.helpTextMode ?? ""),
        hidePlaceholder: true,
        // advanced: true,
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
        displayName: "Field only",
        description:
          "Don't render anything but the wrapped field component - so no label, help text, validation error, etc.",
        advanced: true,
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerForm",
    importName: "FormItemWrapper",
  });
}

export interface FormGroupProps {
  name: string;
  children: React.ReactNode;
}

function FormGroup(props: FormGroupProps) {
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
    displayName: "Form Group",
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
    unstable__refActions: {
      add: {
        displayName: "Add an item",
        parameters: [
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
        parameters: [
          {
            name: "index",
            displayName: "Index",
            type: "number",
          },
        ],
      },
      move: {
        displayName: "Move field",
        parameters: [
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
