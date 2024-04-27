import {
  useAnalyticsData,
  useProjectAnalyticsMeta,
} from "@/wab/client/components/analytics/analytics-contexts";
import {
  getAnalyticsQueryTypeFromEvent,
  TimeRange,
} from "@/wab/client/components/analytics/utils";
import {
  ApiAnalyticsConversionRateResult,
  ApiAnalyticsConversionResult,
  ApiAnalyticsImpressionResult,
} from "@/wab/shared/ApiSchema";

export interface ChartFilters {
  teamId: string;
  workspaceId?: string;
  projectId?: string;
  componentId?: string;
  splitId?: string;
  timeRange: TimeRange;
  event: string;
  period: string;
}

export function useChartData(props: ChartFilters) {
  const { timeRange, event, teamId, projectId, splitId, componentId, period } =
    props;
  const analyticsQuery = useAnalyticsData({
    teamId,
    projectId,
    splitId,
    componentId,
    from: timeRange[0] ?? undefined,
    to: timeRange[1] ?? undefined,
    type: getAnalyticsQueryTypeFromEvent(event),
    period,
  });
  const projectMeta = useProjectAnalyticsMeta(teamId, projectId) ?? {
    pages: [],
    splits: [],
  };

  function isLoading() {
    return !analyticsQuery;
  }

  function isEmpty() {
    if (!analyticsQuery) {
      return true;
    }

    function isArrayWithNoData(
      arr:
        | ApiAnalyticsImpressionResult[]
        | ApiAnalyticsConversionResult[]
        | ApiAnalyticsConversionRateResult[]
    ) {
      return !arr.some((elem) => {
        return elem.impressions > 0 || elem.conversions > 0 || elem.renders > 0;
      });
    }

    const data = analyticsQuery.data;
    if (Array.isArray(data)) {
      return isArrayWithNoData(data);
    }
    // if itsn't an array the user must have selected a split
    if (!splitId) {
      return true;
    }

    const split = projectMeta.splits.find((s) => s.id === splitId);
    const sliceOriginal = split?.slices[0].id;
    const sliceOverride = split?.slices[1].id;

    if (!split || !sliceOriginal || !sliceOverride) {
      return true;
    }

    if (
      (!data[sliceOriginal] || isArrayWithNoData(data[sliceOriginal])) &&
      (!data[sliceOverride] || isArrayWithNoData(data[sliceOverride]))
    ) {
      return true;
    }

    return false;
  }

  return {
    isLoading: isLoading(),
    isEmpty: isEmpty(),
    paywall: analyticsQuery?.type === "paywall",
    analyticsQuery,
    projectMeta,
  };
}
