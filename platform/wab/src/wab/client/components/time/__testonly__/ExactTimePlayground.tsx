import { ExactTime, localTimeZone } from "@/wab/shared/utils/date-utils";
import { uniq } from "lodash";
import * as React from "react";
import { Temporal } from "temporal-polyfill";

const TIME_ZONES = uniq([
  localTimeZone(),
  "UTC",
  ...Intl.supportedValuesOf("timeZone"),
]);

export interface ExactTimePlaygroundProps {
  initialDateTime?: string;
  initialTimeZone: string;
  initialZoned?: boolean;
  children: (props: {
    value: ExactTime;
    zoned: Temporal.ZonedDateTime;
  }) => React.ReactNode;
}

export function ExactTimePlayground({
  initialDateTime,
  initialTimeZone,
  initialZoned,
  children,
}: ExactTimePlaygroundProps) {
  const [dateTime, setDateTime] = React.useState(
    () =>
      initialDateTime ??
      Temporal.Now.plainDateTimeISO(initialTimeZone)
        .add({ seconds: 5 })
        .toString({ smallestUnit: "second" }),
  );
  const [timeZone, setTimeZone] = React.useState(initialTimeZone);
  const [isZoned, setIsZoned] = React.useState(initialZoned);

  const zoned = Temporal.PlainDateTime.from(dateTime).toZonedDateTime(timeZone);
  const value = isZoned === false ? zoned.toInstant() : zoned;

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <input
          aria-label="Date and time"
          type="datetime-local"
          step={1}
          value={dateTime}
          onChange={(e) => {
            if (e.target.value) {
              setDateTime(e.target.value);
            }
          }}
        />
        <select
          aria-label="Time zone"
          value={timeZone}
          onChange={(e) => setTimeZone(e.target.value)}
        >
          {TIME_ZONES.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
        {isZoned !== undefined &&
          (
            [
              [false, "Instant"],
              [true, "ZonedDateTime"],
            ] as const
          ).map(([z, label]) => (
            <label key={label}>
              <input
                type="radio"
                name="zoned"
                checked={isZoned === z}
                onChange={() => setIsZoned(z)}
              />{" "}
              {label}
            </label>
          ))}
      </div>
      {children({ value, zoned })}
    </div>
  );
}
