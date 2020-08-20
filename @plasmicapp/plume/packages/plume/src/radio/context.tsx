import * as React from "react";
import { RadioGroupState } from '@react-stately/radio';

export interface RadioGroupContextValue {
  state: RadioGroupState;
  isDisabled?: boolean;
  isReadOnly?: boolean;
}
export const RadioGroupContext = React.createContext<RadioGroupContextValue|undefined>(undefined);

export function useRadioGroupContext() {
  const state = React.useContext(RadioGroupContext);
  if (!state) {
    throw new Error("Radio must be used from within a RadioGroup!");
  }
  return state;
}