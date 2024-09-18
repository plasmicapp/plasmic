import React from "react";
import type { FormProps } from "react-aria-components";
import { Form } from "react-aria-components";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

interface BaseFormProps extends Omit<FormProps, "onSubmit"> {
  onSubmit: (
    data: Record<string, FormDataEntryValue | FormDataEntryValue[] | null>
  ) => void;
}

export function BaseForm(props: BaseFormProps) {
  const { onSubmit, children, ...rest } = props;
  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const formValues: {
          [key: string]: FormDataEntryValue | FormDataEntryValue[] | null;
        } = {};
        formData.forEach((value, key) => {
          const field = e.currentTarget.elements.namedItem(key);
          if (
            field instanceof RadioNodeList &&
            (Array.from(field.values()) as HTMLInputElement[]).every(
              (f) => f.type === "checkbox"
            )
          ) {
            formValues[key] = formData.getAll(key);
          } else {
            (field as HTMLInputElement).type;
            formValues[key] = formData.get(key);
          }
        });
        onSubmit?.(formValues);
      }}
      {...rest}
    >
      {children}
    </Form>
  );
}

export function registerForm(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseForm>
) {
  registerComponentHelper(
    loader,
    BaseForm,
    {
      name: makeComponentName("form"),
      displayName: "Aria Form",
      importPath: "@plasmicpkgs/react-aria/skinny/registerForm",
      importName: "BaseForm",
      props: {
        children: {
          type: "slot",
          mergeWithParent: true,
        },
        onSubmit: {
          type: "eventHandler",
          argTypes: [{ name: "data", type: "object" }],
        } as any,
        onReset: {
          type: "eventHandler",
          argTypes: [],
        } as any,
      },
      trapsFocus: true,
    },
    overrides
  );
}
