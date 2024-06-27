import { ValueSetState } from "@/wab/client/components/sidebar/sidebar-helpers";
import { XMultiSelect } from "@/wab/client/components/XMultiSelect";
import React from "react";
import { arrayMoveIndex } from "@/wab/shared/collections";
import { withoutNils } from "@/wab/shared/common";

export function MultiSelectEnumPropEditor(props: {
  onChange: (value: any) => void;
  options: { label: string; value: string | number | boolean }[];
  value: (string | number | boolean)[] | undefined;
  className?: string;
  valueSetState?: ValueSetState;
  defaultValueHint?: string[];
  disabled?: boolean;
}) {
  const {
    value,
    onChange,
    options,
    defaultValueHint,
    className,
    disabled,
    ...rest
  } = props;

  const mergedClassNames = `right-panel-input-background__no-height fill-width ${
    className ? className : ""
  }`;
  return (
    <XMultiSelect
      className={mergedClassNames}
      options={options.filter(
        (option) => !(value ?? []).includes(option.value)
      )}
      selectedItems={withoutNils(
        (value ?? []).map((val) => options.find((op) => op.value === val))
      )}
      itemKey={(item) => (item ? JSON.stringify(item.value) : "")}
      onSelect={(item) => onChange([...(value ?? []), item.value])}
      onUnselect={(item) =>
        onChange((value ?? []).filter((v) => v !== item.value))
      }
      filterOptions={(_options, input) => {
        if (!input) {
          return _options;
        }
        return _options.filter((op) =>
          op.label.toLowerCase().includes(input.toLowerCase())
        );
      }}
      renderInput={(_options) => (
        <input {..._options} className="transparent" />
      )}
      renderOption={(option) => option.label}
      renderSelectedItem={(option) => option.label}
      pillClassName="white-bg"
      placeholder={defaultValueHint?.join(",")}
      isDisabled={disabled}
      onReorder={(fromIndex, toIndex) => {
        if (value) {
          onChange(arrayMoveIndex(value, fromIndex, toIndex));
        }
      }}
      {...rest}
    />
  );
}
