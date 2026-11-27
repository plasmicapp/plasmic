import {
  FormattedTimeText,
  FormattedTimeTextProps,
} from "@/wab/client/components/time/FormattedTimeText";
import { TimeTooltip } from "@/wab/client/components/time/TimeTooltip";
import { formatRelative } from "@/wab/shared/utils/date-utils";
import * as React from "react";

export type FormattedTimeProps = FormattedTimeTextProps;

/** Combination of {@link FormattedTimeText} and {@link TimeTooltip}. */
export function FormattedTime({ value, format }: FormattedTimeProps) {
  return (
    <TimeTooltip value={value} hideRelative={format === formatRelative}>
      <FormattedTimeText value={value} format={format} />
    </TimeTooltip>
  );
}
