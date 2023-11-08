import * as React from "react";
import { useLabel as useAriaLabel } from "react-aria";
import { ListState } from "react-stately";

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

function getNextKey<T>(
  state: ListState<T>,
  key: React.Key,
  dir: "before" | "after"
) {
  if (dir === "before") {
    return state.collection.getKeyBefore(key);
  } else {
    return state.collection.getKeyAfter(key);
  }
}

function getFirstItemKey<T>(
  state: ListState<T>,
  key: React.Key | null,
  dir: "before" | "after"
) {
  while (key) {
    const item = state.collection.getItem(key);
    if (item && item.type === "item" && !state.disabledKeys.has(key)) {
      return key;
    }
    key = getNextKey(state, key, dir);
  }
  return null;
}
