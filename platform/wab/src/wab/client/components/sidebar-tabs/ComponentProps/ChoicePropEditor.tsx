import {
  EnumPropEditor,
  EnumWithSearchPropEditor,
  OptionValue,
} from "@/wab/client/components/sidebar-tabs/ComponentProps/EnumPropEditor";
import { MultiSelectEnumPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/MultiSelectEnumPropEditor";
import { ValueSetState } from "@/wab/client/components/sidebar/sidebar-helpers";
import L from "lodash";
import React from "react";

type ChoicePropEditorProps<T extends OptionValue> = {
  attr: string;
  readOnly?: boolean;
  valueSetState?: ValueSetState;
  options: (string | number | boolean | { label: string; value: T })[];
  allowSearch?: boolean;
  onSearch?: (value: string) => void;
  filterOption?: boolean;
} & (
  | {
      onChange: (value: T[]) => void;
      value: T[] | undefined;
      multiSelect: true;
      defaultValueHint: string[];
    }
  | {
      onChange: (value: T) => void;
      value: T | undefined;
      multiSelect?: false;
      defaultValueHint: string;
    }
);

export function ChoicePropEditor<T extends OptionValue>(
  props: ChoicePropEditorProps<T>
) {
  const {
    readOnly,
    onChange,
    defaultValueHint,
    attr,
    valueSetState,
    value,
    options,
    allowSearch,
    multiSelect,
  } = props;

  if (allowSearch) {
    return <EnumWithSearchPropEditor {...props} />;
  } else if (multiSelect) {
    return (
      <MultiSelectEnumPropEditor
        className="flex-fill SidebarSection__Container--NoBorder"
        onChange={onChange}
        options={options.map((v) =>
          !L.isObject(v)
            ? { value: v as T, label: `${v}` }
            : { value: v.value, label: `${v.label}` }
        )}
        value={value}
        defaultValueHint={defaultValueHint}
        showDropdownArrow
      />
    );
  }
  return (
    <EnumPropEditor
      value={value}
      onChange={onChange}
      options={options.map((v) =>
        !L.isObject(v)
          ? { value: v, label: `${v}` }
          : { value: v.value, label: `${v.label}` }
      )}
      className={"form-control"}
      valueSetState={valueSetState}
      defaultValueHint={defaultValueHint as string}
      readOnly={readOnly}
      data-plasmic-prop={attr}
    />
  );
}
