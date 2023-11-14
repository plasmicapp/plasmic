import { Form, type FormInstance, type FormItemProps } from "antd";
import React from "react";

export const PathContext = React.createContext<{
  relativePath: (string | number)[]; // used for form.items inside a form.list
  fullPath: (string | number)[];
}>({ relativePath: [], fullPath: [] });

export const useFormItemRelativeName = (name: FormItemProps["name"]) => {
  const pathCtx = React.useContext(PathContext);
  return typeof name === "object"
    ? [...pathCtx.relativePath, ...name]
    : typeof name === "string"
    ? [...pathCtx.relativePath, name]
    : undefined;
};

export const useFormItemFullName = (name: FormItemProps["name"]) => {
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

export interface FieldEntity {
  fullPath: (string | number)[];
  name: string | number | undefined;
  preserve: boolean;
}

/**
 * - registeredFields: current mounted form fields
 * - preservedRegisteredFields: all fields that were registered and were marked as NOT preserve
 */
export interface InternalFieldCtx {
  registeredFields: FieldEntity[];
  preservedRegisteredFields: FieldEntity[];
}

export interface CommonFormControlContextData {
  formInstance?: FormInstance<any>;
  layout?: FormLayoutContextValue;
  internalFieldCtx?: InternalFieldCtx;
}

export interface InternalFormInstanceContext
  extends CommonFormControlContextData {
  fireOnValuesChange: () => void;
  forceRemount: () => void;
  registerField: (fieldEntity: FieldEntity) => () => void;
  internalFieldCtx: InternalFieldCtx;
  initialValues: Record<string, any>;
}

export const InternalFormInstanceContext = React.createContext<
  InternalFormInstanceContext | undefined
>(undefined);

export interface FormLayoutContextValue {
  layout: React.ComponentProps<typeof Form>["layout"];
  labelSpan?: number;
}

export const FormLayoutContext = React.createContext<
  FormLayoutContextValue | undefined
>(undefined);
