import { DatePicker } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import kebabCase from "lodash/kebabCase";
import React, { useMemo } from "react";
import { capitalize, Registerable, registerComponentHelper } from "./utils";

import localeData from "dayjs/plugin/localeData";
import weekday from "dayjs/plugin/weekday";

dayjs.extend(weekday);
dayjs.extend(localeData);

const { RangePicker } = DatePicker;

function getDayjsRange(dateRange: any): [Dayjs | null, Dayjs | null] {
  return Array.isArray(dateRange)
    ? [
        dateRange[0] ? dayjs(dateRange[0]) : null,
        dateRange[1] ? dayjs(dateRange[1]) : null,
      ]
    : [null, null];
}

function getStrRange(dateRange: any): string[] | undefined {
  return Array.isArray(dateRange)
    ? dateRange.map((date: any) =>
        date && !(typeof date === "string") && "toISOString" in date
          ? date.toISOString()
          : date === null
          ? undefined
          : date
      )
    : undefined;
}

export function AntdDateRangePicker(
  props: Omit<
    React.ComponentProps<typeof RangePicker>,
    | "value"
    | "onChange"
    | "presets"
    | "placeholder"
    | "renderExtraFooter"
    | "disabled"
    | "allowEmpty"
  > & {
    onChange: (value: [string | undefined, string | undefined]) => void;
    value?: [Dayjs, Dayjs];
    // Not sure why this is missing from DatePicker props!
    showTime?: boolean;
    popupScopeClassName: string;
    presets: {
      label: string;
      startDate: string;
      endDate: string;
    }[];
    placeholder: string;
    disableStartDate: boolean;
    disableEndDate: boolean;
    renderExtraFooter: React.ReactNode;
    allowEmptyStartDate: boolean;
    allowEmptyEndDate: boolean;
    disabled: boolean;
    allowEmpty: boolean;
    defaultStartDate?: string;
    defaultEndDate?: string;
    startDate?: string;
    endDate?: string;
  }
) {
  const {
    defaultStartDate,
    defaultEndDate,
    startDate,
    endDate,
    allowEmpty,
    allowEmptyEndDate,
    allowEmptyStartDate,
    disabled,
    renderExtraFooter,
    disableStartDate,
    disableEndDate,
    presets,
    picker,
    placeholder,
    onChange,
    popupScopeClassName,
    className,
    ...rest
  } = props;
  const popupScopeClassNameSelector = popupScopeClassName
    ? `.${popupScopeClassName}`
    : "";
  const css = `
    @media(max-width: 900px) {
      .ant-picker-panels{
        flex-direction: column;
      }
    }

    @media(max-width: 500px) {
      ${popupScopeClassNameSelector}.ant-picker-dropdown {
        top: 20px !important;
        left: 10px !important;
        right: 10px !important;
        max-height: 95vh;
        position: fixed;
        overflow-y: scroll;
        max-width: 100vw;
      }

      ${popupScopeClassNameSelector} .ant-picker-panel-container {
        min-width: 300px;
      }

      ${popupScopeClassNameSelector} .ant-picker-datetime-panel {
        flex-direction: column;
      }

      .${className} .ant-picker-input > input {
        font-size: 16px !important;
      }

      ${popupScopeClassNameSelector} .ant-picker-header-view {
        line-height: unset !important;
      }

      ${popupScopeClassNameSelector} .ant-picker-content {
        height: unset !important;
      }

      ${popupScopeClassNameSelector} .ant-picker-time-panel-column {
        height: 100px;
      }

      ${popupScopeClassNameSelector} .ant-picker-range-arrow {
        display: none;
      }
    }
  `;

  const presetsDayjs = useMemo(
    () =>
      presets
        ?.map((p) => ({ ...p, value: getDayjsRange([p.startDate, p.endDate]) }))
        .filter((p) => p.value[0]?.isValid() && p.value[1]?.isValid()),
    [presets]
  );
  return (
    <>
      <RangePicker
        {...rest}
        picker={picker as any}
        presets={presetsDayjs}
        allowEmpty={
          allowEmpty
            ? [allowEmpty, allowEmpty]
            : [allowEmptyStartDate, allowEmptyEndDate]
        }
        value={getDayjsRange([startDate, endDate])}
        defaultValue={getDayjsRange([defaultStartDate, defaultEndDate])}
        renderExtraFooter={
          renderExtraFooter ? () => renderExtraFooter : undefined
        }
        className={className}
        inputReadOnly
        disabled={disabled ? disabled : [disableStartDate, disableEndDate]}
        placeholder={placeholder?.split(/,\s*/).slice(0, 2) as [string, string]}
        popupClassName={popupScopeClassName}
        // dateString isn't a valid ISO string, and value is a dayjs object.
        onChange={(values, _dateStrings) => {
          onChange?.((getStrRange(values) as [string, string]) || [null, null]);
        }}
      />
      <style dangerouslySetInnerHTML={{ __html: css }} />
    </>
  );
}

export const dateRangePickerComponentName = "plasmic-antd5-date-range-picker";

export const dateRangePickerHelpers = {
  states: {
    startDate: {
      onChangeArgsToValue: (value: string[]) => value[0],
      hidden: (ps: any) => !!ps.__plasmicFormField,
    },
    endDate: {
      onChangeArgsToValue: (value: string[]) => value[1],
      hidden: (ps: any) => !!ps.__plasmicFormField,
    },
  },
};

export function registerDateRangePicker(loader?: Registerable) {
  registerComponentHelper(loader, AntdDateRangePicker, {
    name: dateRangePickerComponentName,
    displayName: "Date Range Picker",
    props: {
      startDate: {
        type: "dateString",
        editOnly: true,
        uncontrolledProp: "defaultStartDate",
        description: "The default start date as ISO strings",
        // TODO: Can there be a default validator attached to each prop type, so dynamic values can be checked?
        hidden: (ps: any) => !!ps.__plasmicFormField,
      },
      endDate: {
        type: "dateString",
        editOnly: true,
        uncontrolledProp: "defaultEndDate",
        description: "The default end date as ISO strings",
        // TODO: Can there be a default validator attached to each prop type, so dynamic values can be checked?
        hidden: (ps: any) => !!ps.__plasmicFormField,
      },
      allowClear: {
        type: "boolean",
        advanced: true,
        defaultValueHint: true,
        description: "Whether to show the clear button",
      },
      autoFocus: {
        type: "boolean",
        description: "Focus when component is rendered",
        defaultValueHint: false,
        advanced: true,
      },
      bordered: {
        type: "boolean",
        advanced: true,
        defaultValueHint: true,
      },
      changeOnBlur: {
        type: "boolean",
        advanced: true,
        description:
          "Trigger change when blur. e.g. datetime picker no need click confirm button",
        defaultValueHint: false,
        hidden: (ps) => !ps.showTime,
      },
      disabled: {
        type: "boolean",
        description: "Disable date range inputs",
        defaultValueHint: false,
      },
      disableStartDate: {
        type: "boolean",
        defaultValueHint: false,
        advanced: true,
        description: "Disable start date input only",
        hidden: (ps) => ps.disabled,
      },
      disableEndDate: {
        type: "boolean",
        defaultValueHint: false,
        advanced: true,
        description: "Disable end date input only",
        hidden: (ps) => ps.disabled,
      },
      picker: {
        type: "choice",
        options: ["date", "week", "month", "quarter", "year"].map((value) => ({
          value,
          label: capitalize(value),
        })),
        defaultValueHint: "date",
      },
      placeholder: {
        type: "string",
        advanced: true,
        defaultValueHint: "Start date, End date",
        description:
          "The placeholders of the start and end date inputs, separated by a comma",
      },
      placement: {
        type: "choice",
        options: ["bottomLeft", "bottomRight", "topLeft", "topRight"].map(
          (value) => ({
            value,
            label: kebabCase(value),
          })
        ),
        advanced: true,
        defaultValueHint: "bottom-left",
        description: "The position where the selection box pops up",
      },
      presets: {
        type: "array",
        advanced: true,
        description: "The preset ranges for quick selection",
        itemType: {
          type: "object",
          nameFunc: (item) => item.label,
          fields: {
            label: "string",
            startDate: {
              type: "dateString",
            },
            endDate: {
              type: "dateString",
            },
          },
        },
      },
      size: {
        type: "choice",
        advanced: true,
        options: ["small", "middle", "large"].map((value) => ({
          value,
          label: capitalize(value),
        })),
        defaultValueHint: "middle",
      },
      status: {
        type: "choice",
        advanced: true,
        options: ["error", "warning"].map((value) => ({
          value,
          label: capitalize(value),
        })),
        description: "Set validation status",
      },
      allowEmpty: {
        type: "boolean",
        advanced: true,
        description: "Allow leaving start or end input empty",
        defaultValueHint: false,
      },
      allowEmptyStartDate: {
        type: "boolean",
        advanced: true,
        description: "Allow leaving start input empty",
        defaultValueHint: false,
        hidden: (ps) => ps.allowEmpty,
      },
      allowEmptyEndDate: {
        type: "boolean",
        advanced: true,
        description: "Allow leaving end input empty",
        defaultValueHint: false,
        hidden: (ps) => ps.allowEmpty,
      },
      renderExtraFooter: {
        type: "slot",
        displayName: "Extra footer",
        hidePlaceholder: true,
      },
      showTime: {
        type: "boolean",
        description: "Enable time selection",
        defaultValueHint: false,
        hidden: (ps) => ps.picker !== undefined && ps.picker !== "date",
      },
      popupScopeClassName: {
        type: "styleScopeClass",
        scopeName: "dateRangePickerPopup",
      } as any,
      popupClassName: {
        type: "class",
        displayName: "Popup container",
        selectors: [
          {
            selector: ":dateRangePickerPopup .ant-picker-panel-container",
            label: "Base",
          },
        ],
      },
      popupHeaderClassName: {
        type: "class",
        displayName: "Popup header",
        selectors: [
          {
            selector: ":dateRangePickerPopup .ant-picker-header",
            label: "Base",
          },
        ],
      },
      popupBodyClassName: {
        type: "class",
        displayName: "Popup body",
        selectors: [
          {
            selector: ":dateRangePickerPopup .ant-picker-body",
            label: "Base",
          },
        ],
      },
      popupFooterClassName: {
        type: "class",
        displayName: "Popup footer",
        selectors: [
          {
            selector: ":dateRangePickerPopup .ant-picker-footer",
            label: "Base",
          },
        ],
      },
      onChange: {
        type: "eventHandler",
        advanced: true,
        argTypes: [{ name: "value", type: "object" }],
      },
    },
    states: {
      startDate: {
        type: "writable",
        valueProp: "startDate",
        onChangeProp: "onChange",
        variableType: "text",
        ...dateRangePickerHelpers.states.startDate,
      },
      endDate: {
        type: "writable",
        valueProp: "endDate",
        onChangeProp: "onChange",
        variableType: "text",
        ...dateRangePickerHelpers.states.endDate,
      },
    },
    componentHelpers: {
      helpers: dateRangePickerHelpers,
      importName: "dateRangePickerHelpers",
      importPath: "@plasmicpkgs/antd5/skinny/registerDateRangePicker",
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerDateRangePicker",
    importName: "AntdDateRangePicker",
  });
}
