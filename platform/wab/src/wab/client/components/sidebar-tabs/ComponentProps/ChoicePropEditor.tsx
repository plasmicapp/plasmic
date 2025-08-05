import {
  EnumPropEditor,
  EnumWithSearchPropEditor,
} from "@/wab/client/components/sidebar-tabs/ComponentProps/EnumPropEditor";
import { MultiSelectEnumPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/MultiSelectEnumPropEditor";
import { ValueSetState } from "@/wab/client/components/sidebar/sidebar-helpers";
import { ChoiceObject, ChoiceOptions, ChoiceValue } from "@plasmicapp/host";
import L from "lodash";
import React from "react";

type ChoicePropEditorProps<T extends ChoiceValue> = {
  attr: string;
  readOnly?: boolean;
  valueSetState?: ValueSetState;
  options: ChoiceOptions;
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

const makeOption = (item: ChoiceValue | ChoiceObject): ChoiceObject => {
  return L.isObject(item)
    ? { value: item.value, label: `${item.label}` }
    : { value: item, label: `${item}` };
};

export function ChoicePropEditor<T extends ChoiceValue>(
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
        options={options.map(makeOption)}
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
      options={options.map(makeOption)}
      className={"form-control"}
      valueSetState={valueSetState}
      defaultValueHint={defaultValueHint as string}
      readOnly={readOnly}
      data-plasmic-prop={attr}
    />
  );
}
