import {
  ActionProps,
  CodeComponentMode,
  ComponentHelpers,
  DataProvider,
  repeatedElement,
  usePlasmicCanvasContext,
} from "@plasmicapp/host";
import { Form, Input, InputNumber, Radio } from "antd";
import type { FormInstance, FormProps } from "antd/es/form";
import type { FormItemProps } from "antd/es/form/FormItem";
import type { FormListOperation, FormListProps } from "antd/es/form/FormList";
import type { ColProps } from "antd/es/grid/col";
import equal from "fast-deep-equal";
import React, { cloneElement, isValidElement } from "react";
import { mergeProps, reactNodeToString } from "./react-utils";
import { buttonComponentName } from "./registerButton";
import { AntdCheckbox, checkboxComponentName } from "./registerCheckbox";
import {
  inputComponentName,
  inputNumberComponentName,
  passwordComponentName,
  textAreaComponentName,
} from "./registerInput";
import { AntdRadioGroup, radioGroupComponentName } from "./registerRadio";
import { AntdSelect, selectComponentName } from "./registerSelect";
import { switchComponentName } from "./registerSwitch";
import {
  arrayEq,
  ensureArray,
  ErrorBoundary,
  get,
  omit,
  Registerable,
  registerComponentHelper,
  setFieldsToUndefined,
  usePrevious,
  pick,
} from "./utils";
import {
  ArrayType,
  CanvasComponentProps,
  ControlExtras,
  PropType,
} from "@plasmicapp/host/registerComponent";
import {
  normalizeData,
  deriveFieldConfigs,
  TableSchema,
  DataOp,
  usePlasmicDataOp,
  SingleRowResult,
  ManyRowsResult,
} from "@plasmicapp/data-sources";
import { AntdDatePicker } from "./registerDatePicker";

const FormItem = Form.Item;
const FormList = Form.List;

export interface InternalFormItemProps extends Omit<FormItemProps, "rules"> {
  rules?: PlasmicRule[];
  noLabel?: boolean;
  customizeProps?: (
    fieldData: CuratedFieldData,
    props: InternalFormItemProps
  ) => FormItemProps;
  setControlContextData?: (data: FormItemControlContextData) => void;
}

export enum InputType {
  Text = "Text",
  TextArea = "Text Area",
  Password = "Password",
  Number = "Number",
  Select = "Select",
  Option = "Option",
  OptionGroup = "Option Group",
  Radio = "Radio",
  RadioGroup = "Radio Group",
  Checkbox = "Checkbox",
  DatePicker = "DatePicker",
  Unknown = "Unkown",
}

export interface SimplifiedFormItemsProp extends InternalFormItemProps {
  inputType: InputType;
  options?: {
    label: string;
    value: string;
  }[];
  optionType?: "default" | "button";
  showTime?: boolean;
  key?: string;
}

interface CommonFormControlContextData {
  formInstance?: FormInstance<any>;
  layout?: FormLayoutContextValue;
  internalFieldCtx?: InternalFieldCtx;
}

export interface FormWrapperControlContextData
  extends CommonFormControlContextData {
  formInstance?: FormInstance<any>;
  schema?: TableSchema;
  minimalFullLengthFields?: Partial<SimplifiedFormItemsProp>[];
  mergedFields?: SimplifiedFormItemsProp[];
}

export enum FormType {
  NewEntry,
  UpdateEntry,
}

export interface FormWrapperProps
  extends FormProps,
    CanvasComponentProps<FormWrapperControlContextData> {
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
  formItems?: SimplifiedFormItemsProp[];
  dataFormItems?: SimplifiedFormItemsProp[];
  mode?: CodeComponentMode;
  formType?: "new-entry" | "update-entry";
  submitSlot?: React.ReactNode;
  data?: DataOp;
}

const PathContext = React.createContext<{
  relativePath: (string | number)[]; // used for form.items inside a form.list
  fullPath: (string | number)[];
}>({ relativePath: [], fullPath: [] });

interface FieldEntity {
  fullPath: (string | number)[];
  name: string | number | undefined;
  preserve: boolean;
}

/**
 * - registeredFields: current mounted form fields
 * - preservedRegisteredFields: all fields that were registered and were marked as NOT preserve
 */
interface InternalFieldCtx {
  registeredFields: FieldEntity[];
  preservedRegisteredFields: FieldEntity[];
}

interface InternalFormInstanceContext extends CommonFormControlContextData {
  fireOnValuesChange: () => void;
  forceRemount: () => void;
  registerField: (fieldEntity: FieldEntity) => () => void;
  internalFieldCtx: InternalFieldCtx;
  initialValues: Record<string, any>;
}

const InternalFormInstanceContext = React.createContext<
  InternalFormInstanceContext | undefined
>(undefined);

interface FormLayoutContextValue {
  layout: React.ComponentProps<typeof Form>["layout"];
  labelSpan?: number;
}

const FormLayoutContext = React.createContext<
  FormLayoutContextValue | undefined
>(undefined);

const Internal = React.forwardRef(
  (
    props: FormWrapperProps & {
      forceRemount: () => void;
      setInternalFieldCtx: React.Dispatch<
        React.SetStateAction<InternalFieldCtx>
      >;
      internalFieldCtx: InternalFieldCtx;
      labelCol?: ColProps & { horizontalOnly?: boolean };
      wrapperCol?: ColProps & { horizontalOnly?: boolean };
      formLayout: FormLayoutContextValue;
    },
    ref: React.Ref<FormRefActions>
  ) => {
    const [form] = Form.useForm();
    const values = form.getFieldsValue(true);
    const lastValue = React.useRef(values);
    const {
      extendedOnValuesChange,
      forceRemount,
      formLayout,
      internalFieldCtx,
      setInternalFieldCtx,
      ...rest
    } = props;
    // extracted from https://github.com/react-component/field-form/blob/master/src/Form.tsx#L120
    let childrenNode;
    if (props.mode !== "simplified") {
      childrenNode =
        typeof props.children === "function"
          ? props.children(values, form)
          : props.children;
    } else {
      childrenNode = (
        <>
          {(props.formItems ?? []).map((formItem) => (
            <ErrorBoundary
              canvasEnvId={(props as any)["data-plasmic-canvas-envs"]}
              message={`Error rendering input for ${
                formItem.label ?? formItem.name ?? "undefined"
              }`}
            >
              <FormItemWrapper
                {...omit(formItem, "key")}
                noLabel={
                  formItem.inputType === InputType.Checkbox || formItem.noLabel
                }
                valuePropName={
                  formItem.valuePropName ??
                  (formItem.inputType === InputType.Checkbox
                    ? "checked"
                    : undefined)
                }
                style={{ width: "100%" }}
              >
                {formItem.inputType === InputType.Text ? (
                  <Input />
                ) : formItem.inputType === InputType.Password ? (
                  <Input.Password />
                ) : formItem.inputType === InputType.TextArea ? (
                  <Input.TextArea />
                ) : formItem.inputType === InputType.Number ? (
                  <InputNumber />
                ) : formItem.inputType === InputType.Checkbox ? (
                  <AntdCheckbox>{formItem.label}</AntdCheckbox>
                ) : formItem.inputType === InputType.Select ? (
                  <AntdSelect options={formItem.options} />
                ) : formItem.inputType === InputType.DatePicker ? (
                  <AntdDatePicker showTime={formItem.showTime} />
                ) : formItem.inputType === InputType.RadioGroup ? (
                  <AntdRadioGroup
                    options={formItem.options}
                    optionType={formItem.optionType}
                    style={{ padding: "8px" }}
                  />
                ) : null}
              </FormItemWrapper>
            </ErrorBoundary>
          ))}
          {props.submitSlot}
        </>
      );
    }

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
    React.useImperativeHandle(ref, () => ({
      formInstance: form,
      setFieldsValue: (newValues: Record<string, any>) => {
        form.setFieldsValue(newValues);
        extendedOnValuesChange?.(form.getFieldsValue(true));
      },
      setFieldValue: (
        namePath: string | number | (string | number)[],
        value: any
      ) => {
        form.setFieldValue(namePath, value);
        extendedOnValuesChange?.(form.getFieldsValue(true));
      },
      resetFields: () => {
        form.resetFields();
        extendedOnValuesChange?.(form.getFieldsValue(true));
      },
      validateFields: async (...args) => {
        try {
          return await form.validateFields(...(args as any));
        } catch (err) {
          return err as any;
        }
      },
      clearFields: () => {
        const values = form.getFieldsValue(true);
        setFieldsToUndefined(values);
        form.setFieldsValue(values);
        extendedOnValuesChange?.(form.getFieldsValue(true));
      },
    }));
    const registerField = React.useCallback(
      (fieldEntity: FieldEntity) => {
        setInternalFieldCtx((ctx) => ({
          registeredFields: [...ctx.registeredFields, fieldEntity],
          preservedRegisteredFields: [
            ...ctx.preservedRegisteredFields,
            fieldEntity,
          ],
        }));
        return () => {
          setInternalFieldCtx((ctx) => ({
            registeredFields: ctx.registeredFields.filter(
              (ent) => ent !== fieldEntity
            ),
            preservedRegisteredFields: ctx.preservedRegisteredFields.filter(
              (ent) => ent !== fieldEntity || fieldEntity.preserve
            ),
          }));
        };
      },
      [setInternalFieldCtx]
    );
    return (
      <InternalFormInstanceContext.Provider
        value={{
          layout: formLayout,
          fireOnValuesChange,
          forceRemount,
          registerField,
          internalFieldCtx,
          initialValues: props.initialValues ?? {},
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
              extendedOnValuesChange?.(form.getFieldsValue(true));
            }}
            onFinish={() => {
              props.onFinish?.(
                pick(
                  form.getFieldsValue(true),
                  ...internalFieldCtx.preservedRegisteredFields.map(
                    (field) => field.fullPath
                  )
                )
              );
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
  }
);

export interface FormRefActions
  extends Pick<
    FormInstance<any>,
    "setFieldsValue" | "resetFields" | "setFieldValue" | "validateFields"
  > {
  clearFields: () => void;
  formInstance: FormInstance<any>;
}

function useFormItemDefinitions(
  rawData:
    | (Partial<SingleRowResult | ManyRowsResult> & {
        error?: Error;
        isLoading?: boolean;
      })
    | undefined,
  props: React.ComponentProps<typeof FormWrapper>,
  formRef: FormRefActions | null,
  commonFormCtxData: CommonFormControlContextData | undefined
) {
  const { mode, dataFormItems, setControlContextData } = props;

  const formInstance = formRef?.formInstance;
  return React.useMemo(() => {
    const data = rawData && normalizeData(rawData);
    const schema = data && data?.schema;
    if (
      mode !== "simplified" ||
      !rawData ||
      rawData.isLoading ||
      rawData.error ||
      !data ||
      !schema ||
      !data.data
    ) {
      setControlContextData?.({
        formInstance,
        ...commonFormCtxData,
      });
      return undefined;
    }
    const row = data.data.length > 0 ? data.data[0] : undefined;
    const { mergedFields, minimalFullLengthFields } =
      deriveFieldConfigs<SimplifiedFormItemsProp>(
        dataFormItems ?? [],
        schema,
        (field) => ({
          inputType: InputType.Text,
          ...(field && {
            key: field.id,
            fieldId: field.id,
            label: field.label ?? field.id,
            name: field.id,
            inputType:
              field.type === "string"
                ? InputType.Text
                : field.type === "number"
                ? InputType.Number
                : field.type === "boolean"
                ? InputType.Checkbox
                : InputType.Text, //missing date and date-time
            initialValue: row ? row[field.id] : undefined,
          }),
        })
      );

    setControlContextData?.({
      schema: data.schema,
      minimalFullLengthFields,
      mergedFields,
      formInstance,
      ...commonFormCtxData,
    });

    return mergedFields;
  }, [
    mode,
    setControlContextData,
    dataFormItems,
    rawData,
    formInstance,
    commonFormCtxData,
  ]);
}

const useRawData = (props: FormWrapperProps) => {
  const rawData = usePlasmicDataOp(props.data);
  return props.data ? rawData : undefined;
};

export const FormWrapper = React.forwardRef(
  (props: FormWrapperProps, ref: React.Ref<FormRefActions>) => {
    const [remountKey, setRemountKey] = React.useState(0);
    const forceRemount = React.useCallback(
      () => setRemountKey((k) => k + 1),
      [setRemountKey]
    );
    const previousInitialValues = usePrevious(props.initialValues);

    const wrapperRef = React.useRef<FormRefActions>(null);
    React.useEffect(() => {
      if (
        previousInitialValues !== props.initialValues &&
        JSON.stringify(previousInitialValues) !==
          JSON.stringify(props.initialValues)
      ) {
        forceRemount();
      }
    }, [previousInitialValues, props.initialValues]);
    const [internalFieldCtx, setInternalFieldCtx] =
      React.useState<InternalFieldCtx>({
        registeredFields: [],
        preservedRegisteredFields: [],
      });

    React.useImperativeHandle(ref, () =>
      wrapperRef.current ? { ...wrapperRef.current } : ({} as FormRefActions)
    );

    const formLayout = React.useMemo(
      () => ({
        layout: props.layout,
        labelSpan: props.labelCol?.span as number | undefined,
      }),
      [props.layout, props.labelCol?.span]
    );

    const commonFormCtxData = React.useMemo<CommonFormControlContextData>(
      () => ({
        layout: formLayout,
        internalFieldCtx,
      }),
      [formLayout, internalFieldCtx]
    );

    const rawData = useRawData(props);
    const formItemDefinitions = useFormItemDefinitions(
      rawData,
      props,
      wrapperRef.current,
      commonFormCtxData
    );
    React.useEffect(() => {
      if (rawData && !rawData.isLoading) {
        forceRemount();
      }
    }, [rawData]);
    const previousDataOp = usePrevious(props.data);
    React.useEffect(() => {
      if (
        (previousDataOp == null && props.data != null) ||
        (previousDataOp != null && props.data == null)
      ) {
        forceRemount();
      }
    }, [props.data]);
    const { dataFormItems, formItems, data, ...rest } = props;
    const actualFormItems =
      props.mode === "simplified" && formItemDefinitions
        ? formItemDefinitions
        : data
        ? dataFormItems
        : formItems;
    const previousFormItems = React.useRef<SimplifiedFormItemsProp[]>([]);
    React.useEffect(() => {
      if (!(rawData && rawData.isLoading)) {
        previousFormItems.current = actualFormItems ?? [];
      }
    }, [rawData, actualFormItems]);
    if (props.mode === "simplified" && rawData && "error" in rawData) {
      return <div>Error when fetching data: {rawData.error.message}</div>;
    }
    const isSchemaForm = props.mode === "simplified" && !!props.data;
    const isLoadingData = rawData?.isLoading;
    return (
      <>
        <Internal
          key={remountKey}
          {...rest}
          forceRemount={forceRemount}
          formLayout={formLayout}
          internalFieldCtx={internalFieldCtx}
          setInternalFieldCtx={setInternalFieldCtx}
          formItems={
            rawData && rawData.isLoading
              ? previousFormItems.current
              : actualFormItems
          }
          ref={wrapperRef}
          style={
            isSchemaForm && isLoadingData
              ? {
                  opacity: 0.5,
                  transitionDelay: "250ms",
                  transition: "1s",
                }
              : {}
          }
        />
        {isSchemaForm && isLoadingData && (
          <div
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
            }}
          />
        )}
      </>
    );
  }
);

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

export const formHelpers: ComponentHelpers<FormWrapperProps> = {
  states: {
    value: {
      onMutate: (value, $ref) => {
        $ref?.formInstance?.setFieldsValue(value);
      },
    },
  },
};

export const formComponentName = "plasmic-antd5-form";
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
          if (!ctx?.schema) {
            // still loading...
            return false;
          }
          if (
            item.fieldId &&
            ctx.schema.fields.some((f) => f.id === item.fieldId)
          ) {
            return false;
          }
          return true;
        },
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
        displayName: "Validate rules",
        type: "choice",
        options: [
          { value: "onBlur", label: "When a field loses focus" },
          { value: "onChange", label: "When a field changes" },
          { value: "onSubmit", label: "When the form is submitted" },
        ],
        multiSelect: true,
        defaultValueHint: ["onChange"],
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
    },
    componentHelpers: {
      helpers: formHelpers,
      importName: "formHelpers",
      importPath: "@plasmicpkgs/antd5/skinny/registerForm",
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
    importPath: "@plasmicpkgs/antd5/skinny/registerForm",
    importName: "FormWrapper",
  });
}

interface FormItemControlContextData extends CommonFormControlContextData {
  parentFormItemPath: (string | number)[];
  status?: ReturnType<typeof Form.Item.useStatus>;
}

interface CuratedFieldData {
  status: string | undefined;
  // path: (string | number)[];
  // errors: string[];
  // warnings: string[];
  // value: any;
  // trigger: (x: any) => void;
}

export interface InternalFormItemProps
  extends Omit<FormItemProps, "rules" | "name">,
    CanvasComponentProps<FormItemControlContextData> {
  rules?: PlasmicRule[];
  description?: React.ReactNode;
  noLabel?: boolean;
  hideValidationMessage?: boolean;
  customizeProps?: (
    fieldData: CuratedFieldData,
    props: InternalFormItemProps
  ) => FormItemProps;
  alignLabellessWithControls?: boolean;
  name?: string;
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
  options?: { value: any }[];
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

export function useFormInstanceMaybe(): FormInstance<any> | undefined {
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
  const pathCtx = React.useContext(PathContext);
  const fieldEntity = React.useRef<FieldEntity>({
    preserve: props.preserve ?? true,
    fullPath: pathCtx.fullPath,
    name,
  }).current;
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
  const {
    fireOnValuesChange,
    forceRemount,
    registerField,
    initialValues,
    internalFieldCtx,
  } = React.useContext(InternalFormInstanceContext) ?? {};
  if (inCanvas) {
    const form = useFormInstanceMaybe();
    const prevPropValues = React.useRef({
      initialValue: props.initialValue,
      name: props.name,
    });
    props.setControlContextData?.({
      internalFieldCtx,
      formInstance: form,
      parentFormItemPath: pathCtx.fullPath,
      layout: layoutContext,
    });
    React.useEffect(() => {
      if (prevPropValues.current.name !== props.name) {
        forceRemount?.();
      }
      if (!fullFormItemName || get(initialValues, fullFormItemName) != null) {
        // this field value is set at the form level
        return;
      }
      form?.setFieldValue(fullFormItemName, props.initialValue);
      prevPropValues.current.initialValue = props.initialValue;
      fireOnValuesChange?.();
    }, [
      form,
      props.initialValue,
      pathCtx.fullPath,
      props.name,
      props.preserve,
    ]);
  }
  React.useEffect(() => {
    fieldEntity.fullPath = [
      ...pathCtx.fullPath,
      ...(props.name != null ? [props.name] : []),
    ];
    fieldEntity.name = props.name;
    fieldEntity.preserve = props.preserve ?? true;
  }, [pathCtx.fullPath, props.name, props.preserve]);
  React.useEffect(() => {
    const unregister = registerField?.(fieldEntity);
    return () => unregister?.();
  }, []);
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
      trigger={deriveOnChangePropName(props)}
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

  const valueProps = (
    React.Children.map(props.children as any, (child) => {
      if (React.isValidElement(child)) {
        const childType = child.type;
        if (childType) {
          const x = (childType as any).__plasmicFormFieldMeta?.valueProp;
          if (x) {
            return x as string;
          }
          // Hard-coding "isChecked" for Plume checkbox / switch
          const plumeType = (childType as any).__plumeType;
          if (
            plumeType &&
            (plumeType === "checkbox" || plumeType === "switch")
          ) {
            return "isChecked";
          }
        }
      }
      return undefined;
    }) ?? []
  ).filter((x: any): x is string => !!x);
  if (valueProps.length > 0) {
    return valueProps[0];
  }
  return undefined;
}

/**
 * Derive the onChange prop to use, if the wrapped child has designated
 * one via its Component.__plasmicFormFieldMeta?.valueProp.
 */
function deriveOnChangePropName(
  props: InternalFormItemProps
): string | undefined {
  if (props.trigger) {
    // Always prefer an explicitly specified valuePropName
    return props.trigger;
  }

  const triggerProps = (
    React.Children.map(props.children as any, (child) => {
      if (React.isValidElement(child)) {
        const childType = child.type;
        if (childType) {
          const x = (childType as any).__plasmicFormFieldMeta?.onChangeProp;
          if (x) {
            return x as string;
          }
        }
      }
      return undefined;
    }) ?? []
  ).filter((x: any): x is string => !!x);
  if (triggerProps.length > 0) {
    return triggerProps[0];
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

function getDefaultValueHint(field: keyof SimplifiedFormItemsProp) {
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

function commonFormItemProps(
  usage: "simplified-form-item"
): Record<string, PropType<InternalFormItemProps>>;
function commonFormItemProps(
  usage: "advanced-form-item"
): Record<string, PropType<FormWrapperProps>>;
function commonFormItemProps(
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
      advanced: true,
      defaultValueHint: getDefaultValueHint("hidden"),
    },
    validateTrigger: {
      type: "choice" as const,
      options: ["onSubmit", "onChange", "onBlur"],
      multiSelect: true as const,
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

const commonSimplifiedFormArrayItemType = (
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

export const formItemComponentName = "plasmic-antd5-form-item";

export function registerFormItem(loader?: Registerable) {
  registerComponentHelper(loader, FormItemWrapper, {
    name: formItemComponentName,
    displayName: "Form Field",
    parentComponentName: formComponentName,
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
          name: inputComponentName,
        },
        ...({ mergeWithParent: true } as any),
      },
      ...commonFormItemProps("advanced-form-item"),
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerForm",
    importName: "FormItemWrapper",
    treeLabel: (ps: any) => ps.name,
    templates: {
      Text: {
        props: {
          children: {
            type: "component",
            name: inputComponentName,
          },
        },
      },
      "Long Text": {
        props: {
          children: {
            type: "component",
            name: textAreaComponentName,
          },
        },
      },
      "Select dropdown": {
        props: {
          children: {
            type: "component",
            name: selectComponentName,
          },
        },
      },
      Number: {
        props: {
          children: {
            type: "component",
            name: inputNumberComponentName,
          },
        },
      },
      Checkbox: {
        props: {
          children: {
            type: "component",
            name: checkboxComponentName,
          },
          noLabel: true,
        },
      },
      Switch: {
        props: {
          children: {
            type: "component",
            name: switchComponentName,
          },
          noLabel: true,
        },
      },
      Radios: {
        props: {
          children: {
            type: "component",
            name: radioGroupComponentName,
          },
        },
      },
      Password: {
        props: {
          children: {
            type: "component",
            name: passwordComponentName,
          },
        },
      },
      "Submit button": {
        props: {
          children: {
            type: "component",
            name: buttonComponentName,
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

export const formGroupComponentName = "plasmic-antd5-form-group";

export function registerFormGroup(loader?: Registerable) {
  registerComponentHelper(loader, FormGroup, {
    name: formGroupComponentName,
    displayName: "Form Field Group",
    parentComponentName: formComponentName,
    actions: COMMON_ACTIONS,
    props: {
      name: {
        type: "string",
        displayName: "Form group key",
        description:
          "Name of the field key for this group of form fields in the submitted form data.",
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

export const formListComponentName = "plasmic-antd5-form-list";

export function registerFormList(loader?: Registerable) {
  registerComponentHelper(loader, FormListWrapper, {
    name: formListComponentName,
    parentComponentName: formComponentName,
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
                name: formItemComponentName,
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
                name: formItemComponentName,
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
