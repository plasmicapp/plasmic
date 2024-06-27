import { ValueSetState } from "@/wab/client/components/sidebar/sidebar-helpers";
import StyleSelect from "@/wab/client/components/style-controls/StyleSelect";
import { ensureArray, filterMapTruthy } from "@/wab/shared/common";
import { Select } from "antd";
import L, { isObject, isString } from "lodash";
import React from "react";

export type OptionValue = string | number | boolean;
const stringify = (value: any): string => {
  // react-aria breaks if the key has double quotes
  return JSON.stringify(value)?.replaceAll('"', "'");
};
const parse = function <T>(value: T): T {
  return L.isString(value) ? JSON.parse(value.replaceAll("'", '"')) : value;
};

const UNSET_SELECT = {
  value: "plasmic.unset" as OptionValue,
  label: "(Unset)",
} as LabeledValue;

type EnumWithSearchPropEditor<T extends OptionValue> = {
  onDelete?: () => void;
  onSearch?: (value: string) => void;
  options: (string | { label: string; value: T })[];
  className?: string;
  readOnly?: boolean;
  filterOption?: boolean;
} & (
  | {
      onChange: (value: T[]) => void;
      value: T[] | undefined;
      multiSelect: true;
      defaultValueHint?: string[];
    }
  | {
      onChange: (value: T) => void;
      value: T | undefined;
      multiSelect?: false;
      defaultValueHint?: string;
    }
);

export function EnumWithSearchPropEditor<T extends OptionValue>(
  props: EnumWithSearchPropEditor<T>
) {
  const {
    value,
    onChange,
    onDelete,
    options: propOptions,
    readOnly,
    multiSelect,
    defaultValueHint,
    ...rest
  } = props;

  const options = onDelete ? [...propOptions, UNSET_SELECT] : propOptions;
  return (
    <Select
      style={{ width: "100%" }}
      showSearch
      onChange={(val) => {
        const parsedVal = parse(val);
        if (parsedVal === UNSET_SELECT.value) {
          onDelete?.();
        } else if (multiSelect) {
          onChange(L.isArray(val) ? val.map((v) => parse(v)) : [val]);
        } else {
          onChange(parsedVal as T);
        }
      }}
      mode={multiSelect ? "multiple" : undefined}
      disabled={readOnly}
      placeholder={defaultValueHint}
      value={
        !value
          ? undefined
          : multiSelect
          ? (ensureArray(value).map(stringify) as T[])
          : (stringify(value) as T)
      }
      {...rest}
    >
      {options.map((option) =>
        isString(option) ? (
          <Select.Option key={option} value={stringify(option)}>
            {option}
          </Select.Option>
        ) : (
          <Select.Option
            key={stringify(option.value)}
            value={stringify(option.value)}
          >
            {option.label}
          </Select.Option>
        )
      )}
    </Select>
  );
}

type LabeledValue = {
  isDisabled?: boolean;
  label: string;
  value: string | number | boolean;
};

type GroupLabeledValue = {
  isDisabled?: boolean;
  label: string;
  values: LabeledValue[];
};

const isGroupLabeledValue = (
  option: LabeledValue | GroupLabeledValue
): option is GroupLabeledValue => "values" in option;

export function EnumPropEditor<T extends OptionValue>(props: {
  onChange: (value: T) => void;
  onDelete?: () => void;
  options: (string | LabeledValue | GroupLabeledValue | boolean)[];
  value: T | undefined;
  className?: string;
  valueSetState?: ValueSetState;
  defaultValueHint?: string;
  readOnly?: boolean;
  disabledTooltip?: React.ReactNode;
  "data-plasmic-prop"?: string;
  name?: string;
}) {
  const {
    value,
    onChange,
    onDelete,
    options: propOptions,
    valueSetState,
    readOnly,
    ...rest
  } = props;

  const options = React.useMemo(
    () => [
      ...filterMapTruthy(propOptions, (option) =>
        isString(option)
          ? {
              value: option,
              label: option,
              isDisabled: false,
            }
          : isObject(option) && "value" in option
          ? {
              value: option.value,
              label: option.label,
              isDisabled: option.isDisabled,
            }
          : isObject(option) && "values" in option
          ? {
              label: option.label,
              values: option.values.map((v) => ({
                label: v.label,
                value: v.value,
                isDisabled: v.isDisabled,
              })),
            }
          : null
      ),
      ...(onDelete ? [UNSET_SELECT] : []),
    ],
    [propOptions, onDelete]
  );

  const placeholder = React.useMemo(() => {
    return (
      options
        .flatMap((option) =>
          isGroupLabeledValue(option) ? option.values : [option]
        )
        .find((option) => option.value === props.defaultValueHint)?.label ??
      props.defaultValueHint ??
      "unset"
    );
  }, [options, props.defaultValueHint]);
  return (
    <StyleSelect
      value={value == null ? null : stringify(value)}
      onChange={(val) => {
        if (val === null) {
          return;
        }
        const parsedVal = parse(val as T);
        if (parsedVal === UNSET_SELECT.value) {
          onDelete?.();
        } else {
          onChange(parsedVal);
        }
      }}
      placeholder={placeholder}
      valueSetState={valueSetState}
      isDisabled={readOnly}
      data-plasmic-prop={props["data-plasmic-prop"]}
      {...rest}
    >
      {options.map((option) =>
        isGroupLabeledValue(option) ? (
          <StyleSelect.OptionGroup key={option.label} title={option.label}>
            {option.values.map((v) => (
              <StyleSelect.Option
                key={stringify(v.value)}
                value={stringify(v.value)}
                textValue={v.label}
                isDisabled={v.isDisabled}
              >
                {v.label}{" "}
              </StyleSelect.Option>
            ))}
          </StyleSelect.OptionGroup>
        ) : (
          <StyleSelect.Option
            key={stringify(option.value)}
            value={stringify(option.value)}
            textValue={option.label}
            isDisabled={option.isDisabled}
          >
            {option.label}
          </StyleSelect.Option>
        )
      )}
    </StyleSelect>
  );
}
