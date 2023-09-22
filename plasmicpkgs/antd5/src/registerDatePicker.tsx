import { DatePicker } from "antd";
import React, { useEffect, useState } from "react";
import { capitalize, Registerable, registerComponentHelper } from "./utils";
import dayjs, { Dayjs } from "dayjs";

/**
 * onChangeIsoString uses ISO strings rather than dayjs.
 *
 * On mobile, Ant DatePicker is unusable, so also have a hidden native picker for the popup.
 */
export function AntdDatePicker(
  props: Omit<React.ComponentProps<typeof DatePicker>, "value" | "onChange"> & {
    onChange?: (value: string | null) => void;
    value?: Dayjs | string | null;
    // Not sure why this is missing from DatePicker props!
    showTime?: boolean;
    popupScopeClassName?: string;
  }
) {
  const nativeInput = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const strValue: string | undefined =
    props.value &&
    typeof props.value === "object" &&
    "toISOString" in props.value
      ? props.value.toISOString()
      : props.value === null
      ? undefined
      : props.value;

  const { picker, popupScopeClassName, ...rest } = props;
  return (
    <>
      <DatePicker
        {...rest}
        picker={picker as any}
        value={
          props.value === undefined
            ? undefined
            : !props.value
            ? null
            : dayjs(props.value)
        }
        defaultValue={
          props.defaultValue === undefined
            ? undefined
            : dayjs(props.defaultValue)
        }
        popupClassName={popupScopeClassName}
        // dateString isn't a valid ISO string, and value is a dayjs object.
        onChange={(value, _dateString) => {
          props.onChange?.(value !== null ? value.toISOString() : null);
        }}
        open={open}
        onOpenChange={(_open) => {
          if (_open && window.innerWidth < 500) {
            nativeInput.current!.showPicker();
          } else {
            setOpen(_open);
          }
        }}
      />
      <input
        hidden
        ref={nativeInput}
        type={props.showTime ? "datetime-local" : "date"}
        // Clearing -> undefined -> will leave it unchanged, so set ""
        value={strValue || ""}
        onChange={(e) => {
          props.onChange?.(e.target.value);
        }}
      />
    </>
  );
}

export const datePickerComponentName = "plasmic-antd5-date-picker";

export function registerDatePicker(loader?: Registerable) {
  registerComponentHelper(loader, AntdDatePicker, {
    name: datePickerComponentName,
    displayName: "Date/Time Picker",
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
      onChange: {
        type: "eventHandler",
        argTypes: [{ name: "value", type: "string" }],
      },
      picker: {
        type: "choice",
        options: ["date", "week", "month", "quarter", "year"].map((value) => ({
          value,
          label: capitalize(value),
        })),
        defaultValueHint: "date",
      },
      popupScopeClassName: {
        type: "styleScopeClass",
        scopeName: "datePickerPopup",
      } as any,
      popupClassName: {
        type: "class",
        displayName: "Popup container",
        selectors: [
          {
            selector: ":datePickerPopup .ant-picker-panel-container",
            label: "Base",
          },
        ],
      },
      popupHeaderClassName: {
        type: "class",
        displayName: "Popup header",
        selectors: [
          {
            selector: ":datePickerPopup .ant-picker-header",
            label: "Base",
          },
        ],
      },
      popupBodyClassName: {
        type: "class",
        displayName: "Popup body",
        selectors: [
          {
            selector: ":datePickerPopup .ant-picker-body",
            label: "Base",
          },
        ],
      },
      popupFooterClassName: {
        type: "class",
        displayName: "Popup footer",
        selectors: [
          {
            selector: ":datePickerPopup .ant-picker-footer",
            label: "Base",
          },
        ],
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
        onChangeProp: "onChange",
        variableType: "text",
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerDatePicker",
    importName: "AntdDatePicker",
  });
}
