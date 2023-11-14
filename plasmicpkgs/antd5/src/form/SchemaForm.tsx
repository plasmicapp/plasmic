import {
  deriveFieldConfigs,
  ManyRowsResult,
  normalizeData,
  SingleRowResult,
  TableSchema,
  usePlasmicDataOp,
} from "@plasmicapp/data-sources";
import { Input, InputNumber } from "antd";
import React from "react";
import { AntdCheckbox } from "../registerCheckbox";
import { AntdDatePicker } from "../registerDatePicker";
import { AntdRadioGroup } from "../registerRadio";
import { AntdSelect } from "../registerSelect";
import { ErrorBoundary, omit, usePrevious } from "../utils";
import {
  FormRefActions,
  FormWrapper,
  FormWrapperProps,
  InputType,
  SchemaFormContext,
  SimplifiedFormItemsProp,
} from "./Form";
import { FormItemWrapper } from "./FormItem";

export function deriveFormFieldConfigs(
  dataFormItems: SimplifiedFormItemsProp[],
  schema: TableSchema,
  data: any
) {
  return deriveFieldConfigs<SimplifiedFormItemsProp>(
    dataFormItems,
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
        initialValue: data ? data[field.id] : undefined,
      }),
    })
  );
}

function useFormItemDefinitions(
  rawData:
    | (Partial<SingleRowResult | ManyRowsResult> & {
        error?: Error;
        isLoading?: boolean;
      })
    | undefined,
  props: React.ComponentProps<typeof FormWrapper>
) {
  const { mode, dataFormItems, setControlContextData } = props;

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
      return undefined;
    }
    const row = data.data.length > 0 ? data.data[0] : undefined;
    return deriveFormFieldConfigs(dataFormItems ?? [], schema, row);
  }, [mode, setControlContextData, dataFormItems, rawData]);
}

const useRawData = (props: FormWrapperProps) => {
  const rawData = usePlasmicDataOp(props.data);
  return props.data ? rawData : undefined;
};

export const SchemaForm = React.forwardRef(
  (props: FormWrapperProps, ref: React.Ref<FormRefActions>) => {
    const [remountKey, setRemountKey] = React.useState(0);
    const forceRemount = React.useCallback(
      () => setRemountKey((k) => k + 1),
      [setRemountKey]
    );
    const wrapperRef = React.useRef<FormRefActions>(null);
    React.useImperativeHandle(ref, () =>
      wrapperRef.current ? { ...wrapperRef.current } : ({} as FormRefActions)
    );

    const rawData = useRawData(props);
    const formItemDefinitions = useFormItemDefinitions(rawData, props);
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
        ? formItemDefinitions.mergedFields
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
    const childrenNode =
      props.mode === "simplified" ? (
        <>
          {(actualFormItems ?? []).map((formItem) => (
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
      ) : (
        props.children
      );
    const isSchemaForm = props.mode === "simplified" && !!props.data;
    const isLoadingData = rawData?.isLoading;
    return (
      <SchemaFormContext.Provider
        value={{
          mergedFields: formItemDefinitions?.mergedFields,
          minimalFullLengthFields: formItemDefinitions?.mergedFields,
          schema: rawData?.schema,
        }}
      >
        <FormWrapper
          key={remountKey}
          {...rest}
          children={childrenNode}
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
      </SchemaFormContext.Provider>
    );
  }
);

export { SchemaForm as FormWrapper };
