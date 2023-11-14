import type { DataOp, TableSchema } from "@plasmicapp/data-sources";
import { CodeComponentMode, ComponentHelpers } from "@plasmicapp/host";
import { CanvasComponentProps } from "@plasmicapp/host/registerComponent";
import { Form } from "antd";
import type { FormInstance, FormProps } from "antd/es/form";
import type { ColProps } from "antd/es/grid/col";
import equal from "fast-deep-equal";
import React from "react";
import { pick, setFieldsToUndefined, usePrevious } from "../utils";
import {
  CommonFormControlContextData,
  FieldEntity,
  FormLayoutContext,
  FormLayoutContextValue,
  InternalFieldCtx,
  InternalFormInstanceContext,
} from "./contexts";
import { InternalFormItemProps } from "./FormItem";

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

export const SchemaFormContext = React.createContext<
  | {
      schema?: TableSchema;
      minimalFullLengthFields?: Partial<SimplifiedFormItemsProp>[];
      mergedFields?: SimplifiedFormItemsProp[];
    }
  | undefined
>(undefined);

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
    const schemaFormCtx = React.useContext(SchemaFormContext);
    props.setControlContextData?.({
      formInstance: form,
      layout: formLayout,
      internalFieldCtx,
      ...(schemaFormCtx ? schemaFormCtx : {}),
    });

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

    return (
      <Internal
        key={remountKey}
        forceRemount={forceRemount}
        formLayout={formLayout}
        internalFieldCtx={internalFieldCtx}
        setInternalFieldCtx={setInternalFieldCtx}
        ref={wrapperRef}
        {...props}
      />
    );
  }
);

export const formHelpers: ComponentHelpers<FormWrapperProps> = {
  states: {
    value: {
      onMutate: (value, $ref) => {
        $ref?.formInstance?.setFieldsValue(value);
      },
    },
  },
};

export const OPTIMIZED_FORM_IMPORT = {
  name: "FormWrapper",
  path: "@plasmicpkgs/antd5/skinny/Form",
};
