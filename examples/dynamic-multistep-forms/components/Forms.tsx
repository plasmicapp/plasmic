import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";
import constate from "constate";
import produce from "immer";
import React, {
  cloneElement,
  createContext,
  ReactElement,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface FormData {
  steps: Record<string, number>;
  step: number;
  values: Record<string, string>;
  items: Record<string, FormItemMeta>;
}

interface FormItemMeta {
  required: boolean;
}

function isValidated(data: FormData) {
  return Object.entries(data.items).every(
    ([name, meta]) => !meta.required || data.values[name] !== undefined
  );
}

function useFormData() {
  const [values, setValues] = useState<FormData>({
    step: 0,
    steps: {},
    values: {},
    items: {},
  });
  return {
    values,
    registerFormItem(name: string, meta: FormItemMeta) {
      setValues((prev) =>
        produce(prev, (draft) => {
          draft.items[name] = meta;
        })
      );
    },
    unregisterFormItem(name: string) {
      setValues((prev) =>
        produce(prev, (draft) => {
          delete draft.items[name];
        })
      );
    },
    setValue(name: string, value: string) {
      setValues((prev) =>
        produce(prev, (draft) => {
          draft.values[name] = value;
        })
      );
    },
    prev() {
      setValues((prev) =>
        produce(prev, (draft) => {
          draft.step = draft.step - 1;
        })
      );
    },
    next() {
      setValues((prev) =>
        produce(prev, (draft) => {
          draft.step = draft.step + 1;
        })
      );
    },
  };
}

const [FormProvider, useFormContext] = constate(useFormData);

export interface FormContainerProps {
  previewStep?: number;
  previewAll?: boolean;
  children?: ReactNode;
  className?: string;
}

export function FormContainer(props: FormContainerProps) {
  return (
    <FormProvider>
      <FormContainerInner {...props} />
    </FormProvider>
  );
}

function FormContainerInner({
  children,
  className,
  previewStep,
  previewAll,
}: FormContainerProps) {
  const formCtx = useFormContext();
  const step = formCtx.values.step;
  const inEditor = usePlasmicCanvasContext();
  const steps = React.Children.toArray(children);
  // Important to make FormStep the DataProvider, since the child of a DataProvider is always a DataCtxReader, which
  // would interfere with our ability to directly interact with the children array.
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (step + 1 === steps.length) {
          alert(
            "Form submit complete: " +
              JSON.stringify(formCtx.values.values, null, 2)
          );
        } else {
          formCtx.next();
        }
      }}
    >
      {steps.map((child, index) => {
        const actuallyShow = inEditor
          ? previewAll || previewStep === index
          : step === index;
        return (
          actuallyShow && cloneElement(child as ReactElement, { key: index })
        );
      })}
    </form>
  );
}

export interface FormStepProps {
  children?: ReactNode;
  className?: string;
}

export function FormStep({ children, className }: FormStepProps) {
  const formCtx = useFormContext();
  return (
    <DataProvider name={"formData"} data={formCtx.values} label={"Form data"}>
      <div className={className}>{children}</div>
    </DataProvider>
  );
}

export interface FormItemProps {
  children?: ReactNode;
  className?: string;
  name?: string;
  revealName?: string;
  revealValue?: string;
  required?: boolean;
}

export function FormItem({
  children,
  className,
  name = "",
  revealName,
  revealValue,
  required = false,
}: FormItemProps) {
  const formCtx = useFormContext();
  const inEditor = usePlasmicCanvasContext();
  useEffect(() => {
    formCtx.registerFormItem(name, {
      required,
    });
    () => formCtx.unregisterFormItem(name);
  }, [name, required]);
  const actualShown =
    inEditor ||
    !revealName ||
    formCtx.values.values[revealName] === revealValue;
  return actualShown ? (
    <div className={className}>
      <FormItemContext.Provider value={{ name }}>
        {children}
      </FormItemContext.Provider>
    </div>
  ) : null;
}

interface FormItemData {
  name: string;
}

export const FormItemContext = createContext<FormItemData | undefined>(
  undefined
);

export interface RadioInputProps {
  children?: ReactNode;
  value?: string;
  className?: string;
}

export function RadioInput({ children, value, className }: RadioInputProps) {
  const itemCtx = useContext(FormItemContext);
  const formCtx = useFormContext();
  const inEditor = usePlasmicCanvasContext();
  useEffect(() => {
    if (inEditor && itemCtx?.name) {
      // Just a placeholder. For ex if users create a data bound text like:
      //
      // `You chose ${carMake}`
      //
      // They won't just see the empty string, they'll see "You chose (carMake)."
      formCtx.setValue(itemCtx.name, `(${itemCtx.name})`);
    }
  }, [inEditor, itemCtx?.name]);
  if (!itemCtx) {
    return <div>MUST BE INSIDE A FORM ITEM</div>;
  }
  return (
    <label className={className}>
      <input
        type={"radio"}
        name={itemCtx.name}
        value={value}
        checked={formCtx.values.values[itemCtx.name] === value}
        onChange={(e) => formCtx.setValue(itemCtx.name, e.target.value)}
      />
      {children}
    </label>
  );
}

interface FormActionProps {
  children?: ReactNode;
  action?: string;
}

export function FormAction({ children, action }: FormActionProps) {
  const formCtx = useFormContext();
  return cloneElement(React.Children.only(children) as ReactElement, {
    isDisabled:
      (action === "next" || action === "submit") &&
      !isValidated(formCtx.values),
    onClick: () => {
      if (action === "prev") {
        formCtx.prev();
      }
      if (action === "next") {
        formCtx.next();
      }
    },
  });
}
