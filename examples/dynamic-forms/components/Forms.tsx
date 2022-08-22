import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";
import constate from "constate";
import React, {
  cloneElement,
  createContext,
  ReactElement,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface FormContainerData {
  steps: Record<string, number>;
  step: number;
  values: Record<string, string>;
}

function useFormData() {
  const [values, setValues] = useState<FormContainerData>({
    step: 0,
    steps: {},
    values: {},
  });
  return {
    values,
    setValue(field: string, value: string) {
      setValues((prev) => ({
        ...prev,
        values: {
          ...prev.values,
          [field]: value,
        },
      }));
    },
    prev() {
      setValues((prev) => ({
        ...prev,
        step: prev.step - 1,
      }));
    },
    next() {
      setValues((prev) => ({
        ...prev,
        step: prev.step + 1,
      }));
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
}

export function FormItem({
  children,
  className,
  name = "",
  revealName,
  revealValue,
}: FormItemProps) {
  const formCtx = useFormContext();
  const inEditor = usePlasmicCanvasContext();
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
  if (!itemCtx) {
    return <div>MUST BE INSIDE A FORM ITEM</div>;
  }
  useEffect(() => {
    if (itemCtx?.name) {
      formCtx.setValue(itemCtx.name, `(${itemCtx.name})`);
    }
  }, [itemCtx?.name, value]);
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
