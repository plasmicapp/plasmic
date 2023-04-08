import {
  ActionProps,
  DataProvider,
  repeatedElement,
  usePlasmicCanvasContext,
} from "@plasmicapp/host";
import Form, { FormProps } from "antd/lib/form";
import FormItem, { FormItemProps } from "antd/lib/form/FormItem";
import FormList, {
  FormListOperation,
  FormListProps,
} from "antd/lib/form/FormList";
import equal from "fast-deep-equal";
import React from "react";
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
const InternalFormInstanceContext = React.createContext<
  | {
      fireOnValuesChange: () => void;
      forceRemount: () => void;
    }
  | undefined
>(undefined);

const Internal = (
  props: FormWrapperProps & {
    setRemountKey: React.Dispatch<React.SetStateAction<number>>;
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
      }}
    >
      <Form
        {...props}
        onValuesChange={(...args) => {
          props.onValuesChange?.(...args);
          props.extendedOnValuesChange?.(args[1]);
        }}
        form={form}
      >
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
    label: "Append new Form.Item",
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
  {
    type: "button-action" as const,
    label: "Append new Form.Group",
    onClick: ({ studioOps }: ActionProps<any>) => {
      studioOps.appendToSlot(
        {
          type: "component",
          name: "plasmic-antd5-form-group",
        },
        "children"
      );
    },
  },
  {
    type: "button-action" as const,
    label: "Append new Form.List",
    onClick: ({ studioOps }: ActionProps<any>) => {
      studioOps.appendToSlot(
        {
          type: "component",
          name: "plasmic-antd5-form-list",
        },
        "children"
      );
    },
  },
];

export function registerForm(loader?: Registerable) {
  registerComponentHelper(loader, FormWrapper, {
    name: "plasmic-antd5-form",
    displayName: "Form",
    props: {
      children: {
        type: "slot",
        defaultValue: [
          {
            type: "component",
            name: "plasmic-antd5-form-item",
          },
          {
            type: "component",
            name: "plasmic-antd5-form-item",
          },
          {
            type: "default-component",
            kind: "button",
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
        type: "code",
        lang: "json",
        forceRemount: true,
      } as any,
      layout: {
        type: "choice",
        options: ["horizontal", "vertical", "inline"],
        defaultValue: "horizontal",
      },
      colon: {
        type: "boolean",
        description: `Configure the default value of colon for Form.Item. Indicates whether the colon after the label is displayed (only effective when prop layout is horizontal)`,
        defaultValue: true,
        advanced: true,
      },
      requiredMark: {
        displayName: "Show required fields?",
        type: "boolean",
        advanced: true,
      },
      extendedOnValuesChange: {
        type: "eventHandler",
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
        argTypes: [
          {
            name: "data",
            type: "object",
          },
        ],
      },
      validateTrigger: {
        type: "choice",
        options: ["onSubmit", "onChange"],
        multiSelect: true,
        defaultValue: ["onChange"],
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

interface InternalFormItemProps extends FormItemProps {
  rules: PlasmicRule[];
}

interface PlasmicRule {
  ruleType:
    | "enum"
    | "len"
    | "max"
    | "min"
    | "required"
    | "whitespace"
    | "advanced";
  length?: number;
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
      case "whitespace":
        rules.push({
          whitespace: true,
          message: plasmicRule.message,
        });
        break;
      case "len":
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

function FormItemWrapper(props: InternalFormItemProps) {
  const relativeFormItemName = useFormItemRelativeName(props.name);
  const fullFormItemName = useFormItemFullName(props.name);
  const rules = props.rules ? plasmicRulesToAntdRules(props.rules) : undefined;

  const inCanvas = !!usePlasmicCanvasContext();
  if (inCanvas) {
    const form = Form.useFormInstance();
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
      if (
        !fullFormItemName ||
        form.getFieldValue(fullFormItemName) !==
          prevPropValues.current.initialValue
      ) {
        // this field value is set at the form level
        return;
      }
      form.setFieldValue(fullFormItemName, props.initialValue);
      prevPropValues.current.initialValue = props.initialValue;
      fireOnValuesChange?.();
    }, [props.initialValue, fullFormItemName]);
  }
  return (
    <FormItem
      {...omit(props, "rules")}
      name={relativeFormItemName}
      rules={rules}
    />
  );
}

export function registerFormItem(loader?: Registerable) {
  registerComponentHelper(loader, FormItemWrapper, {
    name: "plasmic-antd5-form-item",
    displayName: "Form.Item",
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
        displayName: "rules",
      } as any,
      colon: {
        type: "boolean",
        defaultValue: false,
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
    displayName: "Form.Group",
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
    const form = Form.useFormInstance();
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
        form.setFieldValue(fullFormItemName, props.initialValue);
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
    displayName: "Form.List",
    actions: COMMON_ACTIONS,
    props: {
      children: {
        type: "slot",
        defaultValue: [
          {
            type: "component",
            name: "plasmic-antd5-form-item",
            props: {
              name: "item",
            },
          },
        ],
      },
      name: {
        type: "string",
        defaultValue: "list",
      },
      initialValue: {
        type: "object",
        defaultValue: [
          {
            item: "Item 1",
          },
          {
            item: "Item 2",
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
