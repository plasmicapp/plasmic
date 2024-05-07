import { useChartData } from "@/wab/client/components/analytics/useChartData";
import moment, { Moment } from "moment";

export enum TeamAnalyticsFilterParams {
  WorkspaceId = "workspaceId",
  ProjectId = "projectId",
  ComponentId = "componentId",
  SplitId = "splitId",
  TimeRangeFrom = "from",
  TimeRangeTo = "to",
  Event = "event",
  Period = "period",
}

export const COMPONENT_PICKER_INFO =
  "It's only listed components that are root of their <PlasmicRootProvider> and that there was data tracked involving it recently (14 days prior now).";

export const ANALYTICS_EVENTS = [
  {
    label: "Impressions",
    value: "impressions",
  },
  // {
  //   label: "Unique impressions",
  //   value: "unique_impressions",
  // },
  {
    label: "Conversions",
    value: "conversions",
  },
  {
    label: "Conversion Amount",
    value: "conversion_amount",
  },
  // {
  //   label: "Conversion Rate",
  //   value: "conversion_rate",
  // },
];

export type TimeRange = [Moment | null, Moment | null];

export function getAnalyticsQueryTypeFromEvent(event: string) {
  if (event === "conversion_rate") {
    return "conversion_rate";
  }

  if (event.includes("conversion")) {
    return "conversions";
  }

  return "impressions";
}

export function getEventLabel(event: string) {
  return ANALYTICS_EVENTS.find((e) => e.value === event)!.label;
}

export function getXAxisLabel(timeRange: TimeRange) {
  return `From ${moment.utc(timeRange[0]).format("MM-DD")} to ${moment
    .utc(timeRange[1])
    .format("MM-DD")}`;
}

export function getYAxisLabel(event: string, period: string) {
  const suffix = period === "day" ? "per day" : "per month";
  switch (event) {
    case "conversion_rate": {
      return `Conversion rate ${suffix}`;
    }
    case "conversions": {
      return `Conversions ${suffix}`;
    }
    case "conversion_amount": {
      return `Conversion amount ${suffix}`;
    }
    case "impressions": {
      return `Impressions ${suffix}`;
    }
    case "unique_impressions": {
      return `Unique impressions ${suffix}`;
    }
  }
  throw new Error("Unexpected event in getYAxisLabel");
}

export function getFormattedRange(
  from: Moment,
  to: Moment,
  period: "day" | "month"
) {
  // format data to include all hours/days in the range
  const FORMAT = {
    day: "YYYY-MM-DD HH:mm:ss",
    month: "YYYY-MM-DD",
  };
  return {
    from: moment(from).startOf(period).format(FORMAT[period]),
    to: moment(to).endOf(period).format(FORMAT[period]),
  };
}

export function formatChartData(chartData: ReturnType<typeof useChartData>) {
  if (
    chartData.isLoading ||
    chartData.isEmpty ||
    chartData.analyticsQuery?.type === "paywall"
  ) {
    return [];
  }
  const analyticsData = chartData.analyticsQuery?.data;
  if (!analyticsData) {
    return [];
  }
  if (Array.isArray(analyticsData)) {
    return analyticsData;
  }
  const splitKeys = Object.keys(analyticsData);
  const result = splitKeys.reduce((prev, key) => {
    return [...prev, ...analyticsData[key]];
  }, [] as any[]);
  return result;
}

export function getChartHeaders(chartData: ReturnType<typeof useChartData>) {
  if (
    chartData.isLoading ||
    chartData.isEmpty ||
    chartData.analyticsQuery?.type === "paywall"
  ) {
    return [];
  }
  const type = chartData.analyticsQuery?.type!;
  const TIME = {
    label: "Time",
    key: "time",
  };
  switch (type) {
    case "impressions": {
      return [
        TIME,
        {
          label: "Impressions",
          key: "impressions",
        },
        {
          label: "Unique impressions",
          key: "unique_impressions",
        },
      ];
    }
    case "conversions": {
      return [
        TIME,
        {
          label: "Conversions",
          key: "conversions",
        },
        {
          label: "Conversion Amount",
          key: "conversion_amount",
        },
      ];
    }
    case "conversion_rate": {
      return [
        TIME,
        {
          label: "Renders",
          key: "renders",
        },
        {
          label: "Conversions",
          key: "conversions",
        },
        {
          label: "Conversion Rate",
          key: "conversion_rate",
        },
      ];
    }
  }
}
