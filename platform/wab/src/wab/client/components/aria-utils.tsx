import { ensure } from "@/wab/common";
import {
  useFocusManager as useAriaFocusManager,
  useLabel as useAriaLabel,
} from "react-aria";

export interface LabelAriaProps {
  id?: string;
  htmlFor?: string;
}

export interface FieldAriaProps {
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export function useLabel(props: Parameters<typeof useAriaLabel>[0]) {
  return useAriaLabel(props) as {
    labelProps: LabelAriaProps;
    fieldProps: FieldAriaProps;
  };
}

export function useFocusManager() {
  return ensure(useAriaFocusManager(), "not in FocusScope");
}
