import { DatePicker } from "antd";
import React from "react";
import { capitalize, Registerable, registerComponentHelper } from "./utils";
import dayjs from "dayjs";

/**
 * onChangeIsoString uses ISO strings rather than dayjs.
 */
export function AntdDatePicker(
  props: React.ComponentProps<typeof DatePicker> & {
    onChangeIsoString: (value: string | null) => void;
  }
) {
  return (
    <DatePicker
      {...props}
      value={
        props.value === undefined
          ? undefined
          : !props.value
          ? null
          : dayjs(props.value)
      }
      defaultValue={
        props.defaultValue === undefined ? undefined : dayjs(props.defaultValue)
      }
      onChange={(value, dateString) => {
        props.onChange?.(value, dateString);
        props.onChangeIsoString?.(value !== null ? value.toISOString() : null);
      }}
    />
  );
}
AntdDatePicker.__plasmicFormFieldMeta = { valueProp: "checked" };

export const datePickerComponentName = "plasmic-antd5-date-picker";

export function registerDatePicker(loader?: Registerable) {
  registerComponentHelper(loader, AntdDatePicker, {
    name: datePickerComponentName,
    displayName: "Date Time Picker",
    props: {
      value: {
        type: "string",
        editOnly: true,
        uncontrolledProp: "defaultValue",
        description:
          "The current date/time as an ISO string, Date object, or dayjs object",
        hidden: (ps: any) => !!ps.__plasmicFormField,
      },
      disabled: {
        type: "boolean",
        defaultValueHint: false,
      },
      autoFocus: {
        type: "boolean",
        description: "Focus when component is rendered",
        defaultValueHint: false,
        advanced: true,
      },
      onChangeIsoString: {
        type: "eventHandler",
        argTypes: [{ name: "value", type: "string" }],
      } as any,
      picker: {
        type: "choice",
        options: ["date", "week", "month", "quarter", "year"].map((value) => ({
          value,
          label: capitalize(value),
        })),
        defaultValueHint: "date",
      },
      showTime: {
        type: "boolean",
        description: "Enable time selection",
      },
      bordered: {
        type: "boolean",
        advanced: true,
      },
      // TODO - see how it works with plasmic-rich-components
      // format: {
      //   advanced: true
      // },
      showNow: {
        type: "boolean",
        advanced: true,
        description: 'Whether to show the "Now" button',
        defaultValueHint: true,
        hidden: (ps: any) => !ps.showTime,
      },
      showToday: {
        type: "boolean",
        advanced: true,
        description: 'Whether to show the "Today" button',
        defaultValueHint: true,
        hidden: (ps: any) => ps.showTime,
      },
      // disabledDate: {
      //   type: "function",
      //   advanced: true,
      //   description: "Dates to disable",
      // },
      // disabledTime: {
      //   type: "function",
      //   advanced: true,
      //   description: "Times to disable",
      // },
      allowClear: {
        type: "boolean",
        advanced: true,
        description: "Whether to show the clear button",
      },
    },
    states: {
      value: {
        type: "writable",
        valueProp: "value",
        onChangeProp: "onChangeIsoString",
        variableType: "text",
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerDatePicker",
    importName: "AntdDatePicker",
  });
}
