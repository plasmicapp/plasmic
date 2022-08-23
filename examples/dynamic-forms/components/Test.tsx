import constate from "constate";
import { useState } from "react";

interface FormContainerData {
  step: number;
  values: Record<string, string>;
}

function useFormData() {
  const [values, setValues] = useState<FormContainerData>({
    step: 0,
    values: {},
  });
  return {
    values,
    setValue(field: string, value: string) {
      setValues((prev) => {
        console.log("setValues", field, value, prev);
        return {
          ...prev,
          values: {
            ...prev.values,
            [field]: value,
          },
        };
      });
    },
    prev() {
      setValues((prev) => {
        console.log("prev", prev.step - 1, prev);
        return {
          ...prev,
          step: prev.step - 1,
        };
      });
    },
    next() {
      setValues((prev) => {
        console.log("next", prev.step + 1, prev);
        return {
          ...prev,
          step: prev.step + 1,
        };
      });
    },
  };
}

// 1️⃣ Create a custom hook as usual
function useFormData2() {
  const [count, setCount] = useState(0);
  const increment = () => setCount((prevCount) => prevCount + 1);
  return { count, increment };
}

// 2️⃣ Wrap your hook with the constate factory
const [FormProvider, useFormContext] = constate(useFormData);

function Button() {
  // 3️⃣ Use context instead of custom hook
  const { setValue } = useFormContext();
  return <button onClick={() => setValue("a", "1")}>+</button>;
}

function FormContainerInner() {
  // 4️⃣ Use context in other components
  const {
    values: { step: count },
  } = useFormContext();
  console.log("render", count);
  return <span>{count}</span>;
}

export function App() {
  // 5️⃣ Wrap your components with Provider
  return (
    <FormProvider>
      <FormContainerInner />
      <Button />
    </FormProvider>
  );
}
