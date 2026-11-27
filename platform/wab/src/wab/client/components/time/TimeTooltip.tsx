import { useRerenderEverySecond } from "@/wab/client/hooks/useRerenderEverySecond";
import { PlasmicTimeTooltip } from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicTimeTooltip";
import { withoutNils } from "@/wab/shared/common";
import {
  ExactTime,
  displayTimeZone,
  formatDateFullTimeShort,
  formatRelative,
  formatZoneShort,
  localTimeZone,
  toInstant,
} from "@/wab/shared/utils/date-utils";
import classNames from "classnames";
import * as React from "react";

export interface TimeTooltipProps {
  value: ExactTime;
  children: React.ReactNode;
  /** Hide the relative time if it's already shown in children. */
  hideRelative?: boolean;
}

/** Shows the detailed time in different time zones on hover and focus. */
export function TimeTooltip({
  value,
  children,
  hideRelative = false,
}: TimeTooltipProps) {
  const descriptionId = React.useId();
  const [open, setOpen] = React.useState(false);
  const showRelative = open && !hideRelative;
  useRerenderEverySecond(showRelative);
  const relative = showRelative
    ? { text: formatRelative(value), label: "Relative" }
    : undefined;
  const { zoned, local, utc } = React.useMemo(
    () =>
      open
        ? formatTimeZones(value)
        : { zoned: undefined, local: undefined, utc: undefined },
    [open, value],
  );
  const description = withoutNils([relative, zoned, local, utc])
    .map(({ text, label }) => `${text}, ${label}`)
    .join(". ");

  return (
    <PlasmicTimeTooltip
      className={classNames("no-root-reset", "inline-block")}
      isOpen={open}
      onOpenChange={setOpen}
      overrides={{
        trigger: {
          render: ({ className, style }) => (
            <time
              className={className}
              style={style}
              dateTime={toInstant(value).toString()}
              tabIndex={0}
              aria-describedby={open ? descriptionId : undefined}
              onKeyDown={(event) => {
                if (event.key === "Escape" && open) {
                  event.stopPropagation();
                  setOpen(false);
                }
              }}
            >
              {children}
            </time>
          ),
        },
        columns: {
          props: { id: descriptionId, "aria-label": description },
        },
        ...(relative
          ? {
              relativeValue: relative.text,
              relativeLabel: undefined,
            }
          : {
              relativeValue: hiddenCell,
              relativeLabel: hiddenCell,
            }),
        ...(zoned
          ? {
              zonedValue: zoned.text,
              zonedLabel: zoned.label,
            }
          : {
              zonedValue: hiddenCell,
              zonedLabel: hiddenCell,
            }),
        ...(local
          ? {
              localValue: local.text,
              localLabel: local.label,
            }
          : {
              localValue: hiddenCell,
              localLabel: hiddenCell,
            }),
        ...(utc
          ? {
              utcValue: utc.text,
              utcLabel: utc.label,
            }
          : {
              utcValue: hiddenCell,
              utcLabel: hiddenCell,
            }),
      }}
    />
  );
}

const hiddenCell = { render: () => null };

function formatTimeZones(value: ExactTime) {
  const instant = toInstant(value);
  const displayZone = displayTimeZone(value);
  const localZone = localTimeZone();

  function formatZone(zone: string) {
    const zoned = instant.toZonedDateTimeISO(zone);
    return {
      text: formatDateFullTimeShort(zoned),
      label:
        formatZoneShort(zoned) +
        (zone === localZone && zone !== "UTC" ? " (your time)" : ""),
    };
  }

  return {
    // If zoned and local are the same time zone, omit zoned.
    zoned: displayZone === localZone ? undefined : formatZone(displayZone),
    local: formatZone(localZone),
    utc:
      displayZone === "UTC" || localZone === "UTC"
        ? undefined
        : formatZone("UTC"),
  };
}
