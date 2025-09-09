import dayjs, { Dayjs } from "dayjs";
import { roleProp } from "../common-prop-types";
import {
  isValidIsoDate,
  Registerable,
  registerComponentHelper,
} from "../utils";
import { RichCalendar, RichCalendarProps } from "./RichCalendar";

export * from "./RichCalendar";

export const calendarHelpers = {
  states: {
    mode: {
      onChangeArgsToValue: (_date: Dayjs, mode: string) => mode,
    },
    selectedDate: {
      onChangeArgsToValue: (date: Dayjs) => dayjs(date).toISOString(),
    },
  },
};

export const calendarComponentName = "hostless-rich-calendar";

export function registerRichCalendar(loader?: Registerable) {
  registerComponentHelper(loader, RichCalendar, {
    name: calendarComponentName,
    displayName: "Calendar",
    props: {
      data: {
        type: "dataSourceOpData" as any,
        displayName: "Events",
        description:
          "The events data should be a list of records with some date, title and (optionally) color fields. The component will infer the date field from the provided data, but you can also explicitly specify that below.",
      },
      title: roleProp({ role: "title" }),
      date: roleProp({ role: "date", singular: true }),
      color: roleProp({ role: "color", singular: true }),
      value: {
        // Must have a corresponding state and eventhandler for any prop that I want to be able to change in interactive mode.
        editOnly: true,
        uncontrolledProp: "defaultValue",
        type: "dateString",
        description: `The date selected by default as an ISO string`,
        validator: (value: string, ps: RichCalendarProps) => {
          if (!ps.value) {
            return true;
          }
          if (!ps.validRange) {
            return true;
          }
          if (!isValidIsoDate(value)) {
            return "Not a valid ISO string.";
          }
          if (
            dayjs(value).isBefore(ps.validRange[0]) ||
            dayjs(value).isAfter(ps.validRange[1])
          ) {
            return "Not within the valid range";
          }
          return true;
        },
      },
      mode: {
        type: "choice",
        options: ["month", "year"],
        description: "The default display mode of the calendar.",
        defaultValueHint: "month",
      },
      validRange: {
        type: "dateRangeStrings",
        description: "Only allow selection of dates that lie within this range",
        advanced: true,
        validator: (value: [string, string], _ps: RichCalendarProps) => {
          if (!value) {
            return true;
          }
          if (!Array.isArray(value) || value.length !== 2) {
            return "Not an array with 2 items";
          }
          if (!isValidIsoDate(value[0]) || !isValidIsoDate(value[1])) {
            return "Min or max range is not in valid ISO date format.";
          }
          return true;
        },
      },
      headerRender: {
        type: "slot",
        renderPropParams: ["headerProps"],
        hidePlaceholder: true,
        displayName: "Custom Header",
      },
      dateCellRender: {
        type: "slot",
        renderPropParams: ["dateProps"],
        hidePlaceholder: true,
        displayName: "Append Date Cell",
      },
      dateFullCellRender: {
        type: "slot",
        renderPropParams: ["dateProps"],
        hidePlaceholder: true,
        displayName: "Custom Date Cell",
      },
      monthCellRender: {
        type: "slot",
        renderPropParams: ["dateProps"],
        hidePlaceholder: true,
        displayName: "Append Month Cell",
      },
      monthFullCellRender: {
        type: "slot",
        renderPropParams: ["dateProps"],
        hidePlaceholder: true,
        displayName: "Custom Month Cell",
      },
      onPanelChange: {
        type: "eventHandler",
        description:
          "Triggers when the calendar mode changes (e.g. from month to year mode)",
        argTypes: [
          { name: "date", type: "object" },
          { name: "mode", type: "string" },
        ],
      },
      onChange: {
        type: "eventHandler",
        argTypes: [{ name: "date", type: "object" }],
      },
    },
    states: {
      mode: {
        type: "writable",
        valueProp: "mode",
        onChangeProp: "onPanelChange",
        variableType: "text",
        ...calendarHelpers.states.mode,
      },
      selectedDate: {
        type: "writable",
        valueProp: "value",
        onChangeProp: "onChange",
        variableType: "text",
        ...calendarHelpers.states.selectedDate,
      },
    },
    componentHelpers: {
      helpers: calendarHelpers,
      importName: "calendarHelpers",
      importPath: "@plasmicpkgs/plasmic-rich-components/skinny/rich-calendar",
    },
    importPath: "@plasmicpkgs/plasmic-rich-components/skinny/rich-calendar",
    importName: "RichCalendar",
  });
}
