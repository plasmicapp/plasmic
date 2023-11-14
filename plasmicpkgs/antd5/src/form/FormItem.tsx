import { usePlasmicCanvasContext } from "@plasmicapp/host";
import { CanvasComponentProps } from "@plasmicapp/host/registerComponent";
import { Form } from "antd";
import type { FormItemProps } from "antd/es/form/FormItem";
import React, { cloneElement, isValidElement } from "react";
import { mergeProps, reactNodeToString } from "../react-utils";
import { ensureArray, get } from "../utils";
import {
  CommonFormControlContextData,
  FieldEntity,
  FormLayoutContext,
  InternalFormInstanceContext,
  PathContext,
  useFormInstanceMaybe,
  useFormItemFullName,
  useFormItemRelativeName,
} from "./contexts";

const FormItem = Form.Item;

export interface FormItemControlContextData
  extends CommonFormControlContextData {
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
      if (
        !fullFormItemName ||
        get(initialValues, fullFormItemName) != null ||
        props.initialValue == null
      ) {
        // this field value is set at the form level
        return;
      }
      form?.setFieldValue(fullFormItemName, props.initialValue);
      prevPropValues.current.initialValue = props.initialValue;
      fireOnValuesChange?.();
    }, [
      form,
      props.initialValue,
      JSON.stringify(pathCtx.fullPath),
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
    if (i === 0 && isValidElement(child)) {
      let newProps = {
        name: formItemProps.name,
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
      return cloneElement(child, newProps);
    } else {
      return child;
    }
  });
}
