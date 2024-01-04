import { DatePicker } from "antd";
import dayjs, { Dayjs } from "dayjs";
import React from "react";
import { capitalize, Registerable, registerComponentHelper } from "./utils";

/**
 * onChangeIsoString uses ISO strings rather than dayjs.
 *
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
  const { picker, popupScopeClassName, ...rest } = props;

  const css = `

  @media(max-width: 500px) {
    .ant-picker-dropdown {
      top: 20px !important;
      left: 10px !important;
      right: 10px !important;
      max-height: 95vh;
      position: fixed;
      overflow-y: scroll;
    }

    .ant-picker-panel-layout {
      flex-direction: column;
    }

    .ant-picker-presets {
      min-height: 50px;
      min-width: 100%;
    }

    .ant-picker-presets > ul {
      overflow-y: hidden;
      overflow-x: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      flex-direction: column;
    }

    .ant-picker-presets > ul > li {
      margin: 0 !important;
    }

    .ant-picker-panel-container {
      width: 300px;
    }

    .ant-picker-datetime-panel {
      flex-direction: column;
    }

    .ant-picker-header-view {
      line-height: unset !important;
    }

    .ant-picker-content {
      height: unset !important;
    }

    .ant-picker-time-panel-column {
      height: 100px;
    }

    .ant-picker-time-panel-column::after {
      height: 0px !important;
    }

    .ant-picker-time-panel-column::after {
      display: none;
    }
  }`;

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
      />
      <style dangerouslySetInnerHTML={{ __html: css }} />
    </>
  );
}

export const datePickerComponentName = "plasmic-antd5-date-picker";

export const datePickerHelpers = {
  states: {
    value: {
      onChangeArgsToValue: (value: string) => (value ? value : undefined),
      hidden: (ps: any) => !!ps.__plasmicFormField,
    },
  },
};

export function registerDatePicker(loader?: Registerable) {
  registerComponentHelper(loader, AntdDatePicker, {
    name: datePickerComponentName,
    displayName: "Date/Time Picker",
    props: {
      value: {
        type: "dateString",
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
        ...datePickerHelpers.states.value,
      },
    },
    componentHelpers: {
      helpers: datePickerHelpers,
      importName: "datePickerHelpers",
      importPath: "@plasmicpkgs/antd5/skinny/registerDatePicker",
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerDatePicker",
    importName: "AntdDatePicker",
  });
}
