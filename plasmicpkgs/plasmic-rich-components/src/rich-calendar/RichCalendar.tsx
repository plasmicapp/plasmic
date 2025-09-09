import {
  deriveFieldConfigs,
  NormalizedData,
  useNormalizedData,
} from "@plasmicapp/data-sources";
import { parseDate } from "@plasmicpkgs/luxon-parser";
import { Badge, Calendar } from "antd";
import dayjs, { Dayjs } from "dayjs";
import groupBy from "lodash/groupBy";
import React, { useMemo } from "react";
import { BaseColumnConfig, FieldfulProps, RowFunc } from "../field-mappings";
import { getFieldAggregateValue } from "../formatting";
import {
  ensure,
  ensureArray,
  isLikeColor,
  isLikeDate,
  isValidIsoDate,
  maybe,
  mkShortId,
} from "../utils";

import localeData from "dayjs/plugin/localeData";
import weekday from "dayjs/plugin/weekday";

dayjs.extend(weekday);
dayjs.extend(localeData);

type RichCalendarPropsBase = Omit<
  React.ComponentProps<typeof Calendar>,
  "value" | "defaultValue" | "validRange"
>;

export interface RichCalendarProps
  extends FieldfulProps<EventsConfig>,
    RichCalendarPropsBase {
  color: EventsConfig[];
  date: EventsConfig[];
  title: EventsConfig[];
  value: string;
  defaultValue: string;
  validRange: [string | undefined, string | undefined] | undefined;
}

interface Event {
  date: string;
  title: string;
  color?: string;
}

function getEventFullDate(date?: string): string | undefined {
  const parsed = parseDate(date);
  if (!parsed) {
    return undefined;
  }
  const yyyy = parsed.getFullYear();
  const mm = (parsed.getMonth() + 1).toString().padStart(2, "0");
  const dd = parsed.getDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getEventMonthYear(date?: string): string | undefined {
  return getEventFullDate(date)?.substring(0, 7);
}

function EventCell({ events }: { events: Event[] }) {
  if (!events || !events.length) {
    return null;
  }
  return (
    <ul style={{ all: "unset" }}>
      {events.map((e) => (
        <li key={JSON.stringify(e)} style={{ all: "unset", display: "block" }}>
          <Badge color={e.color || "green"} text={e.title} />
        </li>
      ))}
    </ul>
  );
}

export function RichCalendar(props: RichCalendarProps) {
  const {
    data: rawData = {
      data: [],
      schema: {
        id: "inferred",
        fields: [
          {
            id: "id",
            type: "string",
            readOnly: false,
          },
        ],
      },
    },
    value: isoValue,
    defaultValue: isoDefaultValue,
    validRange: isoValidRange,
    dateCellRender,
    dateFullCellRender,
    monthCellRender,
    monthFullCellRender,
    ...rest
  } = props;
  const data = useNormalizedData(rawData);

  const { finalRoles: roleConfigs } = useRoleDefinitions(data, props);
  const {
    eventsByDate,
    eventsByMonth,
  }: {
    eventsByDate: Record<string, Event[]>;
    eventsByMonth: Record<string, Event[]>;
  } = useMemo(() => {
    if (!data) {
      return { eventsByDate: {}, eventsByMonth: {} };
    }
    return data?.data.reduce(
      (acc: any, item: any) => {
        const date = getFieldAggregateValue(item, roleConfigs.date);
        const title = getFieldAggregateValue(item, roleConfigs.title);
        const color = getFieldAggregateValue(item, roleConfigs.color);

        const event = {
          date,
          title,
          color,
        };

        const keyDate = getEventFullDate(date); // extract the date-only part
        const keyMonth = getEventMonthYear(date); // extract the month-year part
        if (keyDate && keyMonth) {
          acc.eventsByDate[keyDate] = [
            ...(acc.eventsByDate[keyDate] || []),
            event,
          ];
          acc.eventsByMonth[keyMonth] = [
            ...(acc.eventsByMonth[keyMonth] || []),
            event,
          ];
        }

        return acc;
      },
      { eventsByDate: {}, eventsByMonth: {} }
    );
  }, [data, roleConfigs.color, roleConfigs.date, roleConfigs.title]);

  const value = useMemo(
    () => (isValidIsoDate(isoValue) ? dayjs(isoValue) : dayjs()),
    [isoValue]
  ); // https://day.js.org/docs/en/parse/now`
  const defaultValue = useMemo(
    () => (isValidIsoDate(isoDefaultValue) ? dayjs(isoDefaultValue) : dayjs()),
    [isoDefaultValue]
  ); // https://day.js.org/docs/en/parse/now

  const validRange: [Dayjs, Dayjs] | undefined = useMemo(() => {
    if (!isoValidRange) {
      return undefined;
    }

    const range = isoValidRange
      .filter((dateIso: string | undefined) => isValidIsoDate(dateIso))
      .map((d: any) => dayjs(d));

    if (range.length !== 2) {
      return undefined;
    }
    return [range[0], range[1]];
  }, [isoValidRange]);

  const key = useMemo(() => JSON.stringify(roleConfigs), [roleConfigs]);

  return (
    <Calendar
      {...rest}
      key={key}
      validRange={validRange}
      // for interactive / preview mode
      defaultValue={defaultValue}
      // for design mode
      value={value}
      dateCellRender={
        dateCellRender
          ? dateCellRender
          : (date: Dayjs) => (
              <EventCell
                events={eventsByDate[getEventFullDate(date.toISOString())!]}
              />
            )
      }
      monthCellRender={
        monthCellRender
          ? monthCellRender
          : (date: Dayjs) => (
              <EventCell
                events={eventsByMonth[getEventMonthYear(date.toISOString())!]}
              />
            )
      }
      dateFullCellRender={dateFullCellRender}
      monthFullCellRender={monthFullCellRender}
    />
  );
}

interface StyleConfig {
  styles: Record<string, any>;
  align: "left" | "center" | "right";
  freeze: "off" | "left" | "right";
}

const defaultColumnConfig = (): EventsConfig =>
  ({
    key: mkShortId(),
    isEditableExpr: () => false,
    disableSorting: false,
    sortByExpr: undefined,
    isHidden: false,
    formatting: {
      styles: {},
      align: "left",
      freeze: "off",
    },
    dataType: "auto" as const,
    role: undefined,
  } as const);

const roles = ["date", "title", "color", "unset"] as const;

export type Role = (typeof roles)[number];

export type EventsConfig = BaseColumnConfig & {
  isEditableExpr: RowFunc<boolean>;
  disableSorting: boolean;
  sortByExpr?: RowFunc<any>;
  formatting: StyleConfig;

  /**
   * The default inferred role, not the actual user-set role.
   */
  role: undefined | Role | "unset";
};

// This component is different from Table/Details since it has various different roles, so the UX is one of setting the choices for each role rather than a single list of fields.
//
// We first infer the defaults for each role.
// This we always need to do because we want the choices to be 'stable'.
// If the user sets one of the roles, without setting the others, we don't want to shift things around on the other roles as a result.
// So the defaults need to always be there (they would only be irrelevant if all roles that would have had defaults were set/overridden by the user).
//
// Then, we layer on the user role choices.
//
// One UX wart is that unsetting a role will restore the default selection instead of clearing it.
// User must know to actually set fieldId to none or (for arrays) remove the item.
// Just another reason to fill in few roles by default.
function useRoleDefinitions(
  data: NormalizedData | undefined,
  props: React.ComponentProps<typeof RichCalendar>
) {
  const { setControlContextData } = props;

  return React.useMemo(() => {
    const schema = data?.schema;
    if (!data || !schema) {
      return { normalized: [], finalRoles: {} };
    }

    function tagFieldConfigs(role: Role) {
      if (role !== "unset") {
        return ensureArray(props[role] ?? []).map((field) => {
          return {
            ...field,
            role,
          };
        });
      } else {
        return [];
      }
    }

    // This is only being computed to get the default role choices.
    const specifiedFieldsPartial = [
      ...tagFieldConfigs("date"),
      ...tagFieldConfigs("color"),
      ...tagFieldConfigs("title"),
    ];

    function doDeriveFieldConfigs(mode: "existing" | "defaults") {
      return deriveFieldConfigs<EventsConfig>(
        mode === "defaults" ? [] : specifiedFieldsPartial,
        schema,
        (field) => ({
          ...defaultColumnConfig(),
          ...(field && {
            key: field.id,
            fieldId: field.id,
            title: field.label || field.id,
            // undefined means not yet determined in this routine, not 'unset'
            role: undefined,
            expr: (currentItem) => currentItem[field.id],
          }),
        })
      );
    }

    // Now we derive the defaults.
    //
    // We always start from a blank slate for this. We want stability - we don't want a situation where we are constantly shifting around the defaults based on what else the user has set.
    //
    // For instance,
    // (1) we derive `city` to be content,
    // (2) user sets `city` as title,
    // (3) we now derive a different content because `city` is used.
    const {
      mergedFields: defaultMergedFields,
      minimalFullLengthFields: defaultMinimalFullLengthFields,
    } = doDeriveFieldConfigs("defaults");

    // Find a good default date field.
    // Filter mergedFields where there are mostly values (in the sampleRows) that are a string that looks like a date in ISO date-only or date-time format, or a timestamp
    // Of these, prefer the one with a name like date, timestamp.
    // Otherwise, prefer the one with a name with that substring.
    // Otherwise, pick any remaining one.
    if (
      data.data.length > 0 &&
      !defaultMergedFields.some((field) => field.role === "date")
    ) {
      const sampleRows = Array.from(
        new Set(
          [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) =>
            Math.round((i / 9) * (data.data.length - 1))
          )
        )
      ).map((i) => data.data[i]);
      const dateFieldCandidates = defaultMergedFields.filter(
        (field) =>
          !field.role &&
          sampleRows.filter(
            (row) => field.fieldId && isLikeDate(row[field.fieldId])
          ).length >=
            sampleRows.length / 2
      );
      const dateField =
        dateFieldCandidates.find((f) =>
          f.fieldId?.match(/^(date|datetime|timestamp|eventdate)$/i)
        ) ??
        dateFieldCandidates.find((f) =>
          f.fieldId?.match(/.*(date|time|event).*/i)
        ) ??
        dateFieldCandidates[0];
      if (dateField) {
        dateField.role = "date";
      }
    }

    // Find a good default color field.
    // Filter mergedFields where there are mostly values (in the sampleRows) that are a string that looks like a color code.
    // Of these, prefer the one with a name like color.
    // Otherwise, prefer the one with a name with that substring.
    // Otherwise, pick any remaining one.
    if (
      data.data.length > 0 &&
      !defaultMergedFields.some((field) => field.role === "color")
    ) {
      const sampleRows = Array.from(
        new Set(
          [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) =>
            Math.round((i / 9) * (data.data.length - 1))
          )
        )
      ).map((i) => data.data[i]);
      const colorFieldCandidates = defaultMergedFields.filter(
        (field) =>
          !field.role &&
          sampleRows.filter(
            (row) => field.fieldId && isLikeColor(row[field.fieldId])
          ).length >=
            sampleRows.length / 2
      );
      const colorField =
        colorFieldCandidates.find((f) =>
          f.fieldId?.match(/^(color|hex|rgb|hsl|rgba|cmyk|hsv|hsb)$/i)
        ) ??
        colorFieldCandidates.find((f) =>
          f.fieldId?.match(/.*(color|hex|rgb|hsl|rgba|cmyk|hsv|hsb).*/i)
        ) ??
        colorFieldCandidates[0];
      if (colorField) {
        colorField.role = "color";
      }
    }

    // Find a good default title field, just based on the field name.
    if (!defaultMergedFields.some((field) => field.role === "title")) {
      const titleField = defaultMergedFields.find(
        (field) =>
          !field.role &&
          field.fieldId?.toLowerCase().match(/^(title|name||event[ _-]?name)$/)
      );
      if (titleField) {
        titleField.role = "title";
      }
    }

    const fieldIdToDefaultRole = new Map(
      defaultMergedFields.map((f) => [f.fieldId, f.role])
    );
    for (const f of defaultMinimalFullLengthFields) {
      f.role = fieldIdToDefaultRole.get(f.fieldId);
    }

    // Now we have the defaults!
    //
    // We once again derive field configs, this time using existing props.
    // Then we add on the derived defaults for the "real merged" fields.
    //
    // Note this is kind of an awkward/wasteful use of deriveFieldConfigs since it was more for table columns originally, and this by-role usage is a different shape of problem. We're mainly using it to fill in / "inflate" the additional settings on these FieldConfigs. Haven't yet bothered finding a better utility interface.
    const { mergedFields, minimalFullLengthFields } =
      doDeriveFieldConfigs("existing");

    const minimalFullLengthFieldsWithDefaults = [
      ...minimalFullLengthFields.filter((f) => f.role && f.role !== "unset"),
      ...defaultMinimalFullLengthFields.filter(
        (f) => f.role && f.role !== "unset" && !props[f.role]
      ),
    ];
    const mergedFieldsWithDefaults = [
      ...mergedFields.filter((f) => f.role && f.role !== "unset"),
      ...defaultMergedFields.filter(
        (f) => f.role && f.role !== "unset" && !props[f.role]
      ),
    ];

    // We now get by-role grouping which is needed by the component.
    const roleConfigs = ensure(
      groupBy(mergedFieldsWithDefaults, (f) => f.role)
    );

    const finalRoles: Partial<Record<Role, EventsConfig[]>> = {};
    for (const role of roles) {
      if (role !== "unset") {
        finalRoles[role] = maybe(props[role], ensureArray) ?? roleConfigs[role];
      }
    }

    setControlContextData?.({
      ...data,
      mergedFields: mergedFieldsWithDefaults,
      minimalFullLengthFields: minimalFullLengthFieldsWithDefaults,
    });

    const normalized = mergedFieldsWithDefaults;
    return { normalized, finalRoles };
  }, [data, setControlContextData, props]);
}
