import { useRerenderEverySecond } from "@/wab/client/hooks/useRerenderEverySecond";
import { ExactTime, formatRelative } from "@/wab/shared/utils/date-utils";
import * as React from "react";

export interface FormattedTimeTextProps {
  value: ExactTime;
  /** See format functions in date-utils. */
  format: (value: ExactTime) => string;
}

/** Formats an exact time and keeps it up-to-date if relative. */
export function FormattedTimeText({ value, format }: FormattedTimeTextProps) {
  useRerenderEverySecond(format === formatRelative);
  return <>{format(value)}</>;
}
