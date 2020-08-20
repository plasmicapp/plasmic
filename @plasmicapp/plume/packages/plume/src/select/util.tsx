import * as React from "react";
import { ListState } from '@react-stately/list';
import { SelectContext } from './context';

export interface OptionState {
  isSelected: boolean;
  isFocused: boolean;
  isDisabled: boolean;
}

export function useSelectOptionState(key: React.Key): OptionState {
  const state = React.useContext(SelectContext);
  if (!state) {
    return {
      isSelected: false,
      isFocused: false,
      isDisabled: false
    };
  }

  return deriveOptionState(state, key);
}

function deriveOptionState(state: ListState<any>, key: React.Key): OptionState {
  return {
    isSelected: state.selectionManager.isSelected(key),
    isFocused: state.selectionManager.focusedKey === key,
    isDisabled: state.disabledKeys.has(key)
  };
}