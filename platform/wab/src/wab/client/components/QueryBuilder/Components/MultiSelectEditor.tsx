import { XMultiSelect } from "@/wab/client/components/XMultiSelect";
import { withoutNils } from "@/wab/shared/common";
import {
  ListItem,
  ListValues,
  MultiSelectWidgetProps,
  SelectFieldSettings,
} from "@react-awesome-query-builder/antd";
import React from "react";

type Props = MultiSelectWidgetProps;

// This widget only supports listValues of type ListItem[]
type MultiSelectOption = ListItem & {
  title: string;
};

function getOptions(listValues?: ListValues): MultiSelectOption[] {
  if (!listValues || !Array.isArray(listValues)) {
    return [];
  }
  return listValues.map((item: ListItem | string | number) =>
    typeof item === "object"
      ? { value: String(item.value), title: String(item.title ?? item.value) }
      : { value: item, title: String(item) }
  );
}

export function MultiSelectEditor(props: Props) {
  const { value, setValue, fieldDefinition } = props;

  const options = getOptions(
    (fieldDefinition?.fieldSettings as SelectFieldSettings)?.listValues
  );

  const selectedValues = value ?? [];

  return (
    <XMultiSelect<MultiSelectOption>
      className="right-panel-input-background__no-height fill-width"
      options={options.filter(
        (option) =>
          !(selectedValues as (string | number)[]).includes(option.value)
      )}
      selectedItems={withoutNils(
        selectedValues.map((val) => options.find((op) => op.value === val))
      )}
      itemKey={(item) => (item ? JSON.stringify(item.value) : "")}
      onSelect={(item) => {
        const newValue = [...selectedValues, item.value];
        setValue(newValue as string[] | number[]);
        return false; // Keep menu open
      }}
      onUnselect={(item) => {
        const newValue = selectedValues.filter((v) => v !== item.value);
        setValue(newValue as string[] | number[]);
      }}
      filterOptions={(_options, input) => {
        if (!input) {
          return _options;
        }
        return _options.filter((op) =>
          op.title.toLowerCase().includes(input.toLowerCase())
        );
      }}
      renderOption={(option) => option.title}
      renderSelectedItem={(option) => option.title}
      pillClassName="white-bg"
      showDropdownArrow={false}
    />
  );
}
