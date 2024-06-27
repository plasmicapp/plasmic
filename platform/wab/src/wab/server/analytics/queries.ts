import { omitNils } from "@/wab/shared/common";
import { getClickHouseConnection } from "@/wab/server/clickhouse";
import { groupBy, mapValues } from "lodash";
import moment from "moment";

export type Period = "day" | "month";

const PERIOD_OPTIONS: Period[] = ["day", "month"];

export function convertValueToPeriod(value: any): Period {
  return PERIOD_OPTIONS.find((e) => e === value) ?? "month";
}

const STARTOF_FUNC: Record<Period, string> = {
  day: "toStartOfDay",
  month: "toStartOfMonth",
};

export enum AnalyticsQueryConstants {
  IS_RENDER = `event = '$render'`,
  IS_CONVERSION = `event = '$conversion'`,
  ROOT_PROVIDER = "provider",
  TEAM_ID = "{teamId:String}",
  PROJECT_ID = "{projectId:String}",
  COMPONENT_ID = "{componentId:String}",
  TIMEZONE = "{timezone:String}",
  FROM = "{from:String}",
  TO = "{to:String}",
  SPLIT_ID = "{splitId:String}",
  START = "{start:Int32}",
  END = "{end:Int32}",
  ROOT_PROJECT_ID = "{rootProjectId:String}",
}

function filterByTeamId(teamId?: string) {
  return teamId
    ? `and has(JSONExtractArrayRaw(events.properties, 'teamIds'), ${AnalyticsQueryConstants.TEAM_ID})`
    : "";
}

function filterByProjectId(projectId?: string) {
  return projectId
    ? `and has(JSONExtractArrayRaw(events.properties, 'projectIds'), ${AnalyticsQueryConstants.PROJECT_ID})`
    : "";
}

function filterByComponentId(
  componentId: string = AnalyticsQueryConstants.ROOT_PROVIDER
) {
  return `and JSONExtractString(events.properties, 'rootComponentId') = ${AnalyticsQueryConstants.COMPONENT_ID}`;
}

function filterByRootProjectId() {
  return `and JSONExtractString(events.properties, 'rootProjectId') = ${AnalyticsQueryConstants.ROOT_PROJECT_ID}`;
}

function selectTime(timezone: string, period: Period = "day") {
  return `${STARTOF_FUNC[period]}(timestamp, ${AnalyticsQueryConstants.TIMEZONE}) as time`;
}

function filterByRange(
  from: string,
  to: string,
  timezone: string,
  period: Period = "day"
) {
  return `
and ${STARTOF_FUNC[period]}(events.timestamp, ${AnalyticsQueryConstants.TIMEZONE}) >= ${AnalyticsQueryConstants.FROM}
and ${STARTOF_FUNC[period]}(events.timestamp, ${AnalyticsQueryConstants.TIMEZONE}) <= ${AnalyticsQueryConstants.TO}
`;
}

function ensureHasSplitId(splitId?: string) {
  return splitId
    ? `and JSONHas(events.properties, ${AnalyticsQueryConstants.SPLIT_ID})`
    : "";
}

function selectSliceFromSplitId(splitId?: string) {
  return splitId
    ? `JSONExtractString(events.properties, ${AnalyticsQueryConstants.SPLIT_ID}) as slice`
    : "";
}

function escapeQuery(query: string) {
  return query
    .replace(/[\t\n]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

interface AnalyticsQueryOpts {
  teamId: string;
  from: string;
  to: string;
  timezone: string;
  projectId?: string;
  componentId?: string;
  splitId?: string;
  period?: Period;
}

export function getImpressionsQuery(opts: AnalyticsQueryOpts) {
  const {
    teamId,
    from,
    to,
    timezone,
    projectId,
    componentId,
    splitId,
    period = "day",
  } = opts;
  return escapeQuery(`
select
  ${selectTime(timezone, period)},
  ${splitId ? selectSliceFromSplitId(splitId) + "," : ""}
  count(*) as impressions,
  count(distinct distinct_id) as unique_impressions
from
  events
where
  ${AnalyticsQueryConstants.IS_RENDER}
  ${filterByTeamId(teamId)}
  ${filterByProjectId(projectId)}
  ${filterByComponentId(componentId)}
  ${ensureHasSplitId(splitId)}
  ${filterByRange(from, to, timezone, period)}
group by
  time
  ${splitId ? ", slice" : ""}
  `);
}

// You cannot have conversions based on Team or based on Components
export function getConversionsQuery(opts: AnalyticsQueryOpts) {
  const {
    teamId,
    from,
    to,
    timezone,
    projectId,
    componentId,
    splitId,
    period = "day",
  } = opts;
  return escapeQuery(`
select
  ${selectTime(timezone, period)},
  ${splitId ? selectSliceFromSplitId(splitId) + "," : ""}
  count(*) as conversions,
  sum(JSONExtractInt(properties, 'value')) as conversion_amount
from
  events
where
  ${AnalyticsQueryConstants.IS_CONVERSION}
  ${filterByProjectId(projectId)}
  ${ensureHasSplitId(splitId)}
  ${filterByRange(from, to, timezone, period)}
group by
  time
  ${splitId ? ", slice" : ""}
  `);
}

export function getConversionRateQuery(opts: AnalyticsQueryOpts) {
  const {
    teamId,
    from,
    to,
    timezone,
    projectId,
    componentId,
    splitId,
    period = "day",
  } = opts;
  return escapeQuery(`
select
  _moment as time,
  ${splitId ? "slice," : ""}
  countIf(maxSteps >= 1) as renders,
  countIf(maxSteps = 2) as conversions,
  if (renders > 0, conversions / renders, 0) as conversion_rate
from (
  select
    distinct_id,
    ${STARTOF_FUNC[period]}(timestamp) as _moment,
    ${splitId ? "slice," : ""}
    max(steps) as maxSteps
  from (
    select
      distinct_id,
      timestamp,
      ${splitId ? "slice," : ""}
      if(latest_render < latest_conversion, 2, if(latest_render is not null, 1, 0)) as steps
    from (
      select
        distinct_id,
        timestamp,
        latest_render,
        ${splitId ? "slice," : ""}
        min(latest_conversion) over (
          partition by (
            distinct_id,
            ${splitId ? "slice," : ""}
            ${STARTOF_FUNC[period]}(timestamp)
          )
          order by timestamp DESC
        ) latest_conversion
      from (
        select
          distinct_id,
          timestamp,
          if(event = '$render', timestamp, null) as latest_render,
          if(event = '$conversion', timestamp, null) as latest_conversion
          ${splitId ? "," + selectSliceFromSplitId(splitId) : ""}
        from events
        where
          (
            (
              ${AnalyticsQueryConstants.IS_RENDER}
              ${filterByTeamId(teamId)}
              ${filterByProjectId(projectId)}
              ${filterByComponentId(componentId)}
              ${ensureHasSplitId(splitId)}
            )
            or
            (
              ${AnalyticsQueryConstants.IS_CONVERSION}
              ${filterByProjectId(projectId)}
              ${ensureHasSplitId(splitId)}
            )
          )
          ${filterByRange(from, to, timezone, period)}
        )
      )
    )
  group by
    distinct_id,
    ${STARTOF_FUNC[period]}(timestamp)
    ${splitId ? ",slice" : ""}
)
group by
  time
  ${splitId ? ",slice" : ""}
  `);
}

interface ImpressionsByTime {
  time: string;
  impressions: number;
  unique_impressions: number;
  slice?: string;
}

const EMPTY_IMPRESSION: ImpressionsByTime = {
  time: "",
  impressions: 0,
  unique_impressions: 0,
};

interface ConversionsByTime {
  time: string;
  conversions: number;
  conversion_amount: number;
  slice?: string;
}

const EMPTY_CONVERSION_EVENT: ConversionsByTime = {
  time: "",
  conversions: 0,
  conversion_amount: 0,
};

interface ConversionRateByTime {
  time: string;
  conversion_rate: number;
  renders: number;
  conversions: number;
}

const EMPTY_CONVERSION_RATE_EVENT: ConversionRateByTime = {
  time: "",
  conversion_rate: 0,
  renders: 0,
  conversions: 0,
};

const DATE_FORMAT = {
  day: "YYYY-MM-DD HH:mm:ss",
  month: "YYYY-MM-DD",
};
// clickhouse query won't fill empty gaps, so we are going to it here, so that empty places are filled
// with zeros
function normalizeQueryResult<T extends { time: string }>(
  result: T[],
  fillWith: T,
  from: string,
  to: string,
  period: Period = "day"
): T[] {
  const properRange = formatFromAndTo(from, to, period);
  from = properRange.from;
  to = properRange.to;
  const norm: T[] = [];
  while (!moment.utc(from).isAfter(moment.utc(to))) {
    const timestamp = moment.utc(from).format(DATE_FORMAT[period]);
    const match = result.find((r) => r.time === timestamp);
    if (match) {
      norm.push(match);
    } else {
      norm.push({
        ...fillWith,
        time: timestamp,
      });
    }
    from = moment(from).add(1, period).format(DATE_FORMAT.month);
  }
  return norm;
}

function normalizeIds(opts: { teamId?: string; projectId?: string }) {
  const { teamId, projectId } = opts;
  return {
    teamId: teamId ? `"${teamId}"` : undefined, // since we are going to run has on JSONExtractArrayRaw, teamId is expected to be "teamId"
    projectId: projectId ? `"${projectId}"` : undefined,
  };
}

export function formatFromAndTo(
  from: string,
  to: string,
  period: Period = "day"
) {
  return {
    from: moment(from).startOf(period).format(DATE_FORMAT[period]),
    to: moment(to).endOf(period).format(DATE_FORMAT[period]),
  };
}

function getQueryParams(opts: AnalyticsQueryOpts) {
  const {
    teamId,
    projectId,
    componentId,
    splitId,
    from,
    to,
    timezone,
    period,
  } = opts;
  return omitNils({
    ...normalizeIds({ teamId, projectId }),
    ...formatFromAndTo(from, to, period),
    componentId: componentId ?? AnalyticsQueryConstants.ROOT_PROVIDER,
    splitId,
    timezone,
  });
}

export async function getImpressions(
  opts: AnalyticsQueryOpts
): Promise<ImpressionsByTime[] | Record<string, ImpressionsByTime[]>> {
  const {
    teamId,
    projectId,
    componentId,
    splitId,
    from,
    to,
    timezone,
    period,
  } = opts;
  const clickhouse = getClickHouseConnection();
  const resultQuery = await clickhouse.query({
    query: getImpressionsQuery({
      teamId,
      projectId,
      componentId,
      splitId,
      from,
      to,
      timezone,
      period,
    }),
    query_params: getQueryParams(opts),
    format: "JSON",
  });
  const result = (await resultQuery.json<any>()).data as ImpressionsByTime[];
  if (!splitId) {
    return normalizeQueryResult(result, EMPTY_IMPRESSION, from, to, period);
  }
  const groupedBySlice = groupBy(result, "slice");
  return mapValues(groupedBySlice, (e) =>
    normalizeQueryResult(e, EMPTY_IMPRESSION, from, to, period)
  );
}

export async function getConversions(
  opts: AnalyticsQueryOpts
): Promise<ConversionsByTime[] | Record<string, ConversionsByTime[]>> {
  const {
    teamId,
    projectId,
    componentId,
    splitId,
    from,
    to,
    timezone,
    period,
  } = opts;

  if (!projectId) {
    throw new Error("Unsupported operation");
  }

  const clickhouse = getClickHouseConnection();
  const resultQuery = await clickhouse.query({
    query: getConversionsQuery({
      teamId,
      projectId,
      componentId,
      splitId,
      from,
      to,
      timezone,
      period,
    }),
    query_params: getQueryParams(opts),
    format: "JSON",
  });
  const result = (await resultQuery.json<any>()).data as ConversionsByTime[];
  if (!splitId) {
    return normalizeQueryResult(
      result,
      EMPTY_CONVERSION_EVENT,
      from,
      to,
      period
    );
  }
  const groupedBySlice = groupBy(result, "slice");
  return mapValues(groupedBySlice, (e) =>
    normalizeQueryResult(e, EMPTY_CONVERSION_EVENT, from, to, period)
  );
}

export async function getConversionRate(
  opts: AnalyticsQueryOpts
): Promise<ConversionRateByTime[] | Record<string, ConversionRateByTime[]>> {
  const {
    teamId,
    projectId,
    componentId,
    splitId,
    from,
    to,
    timezone,
    period,
  } = opts;

  if (!projectId) {
    throw new Error("Unsupported operation");
  }

  const clickhouse = getClickHouseConnection();
  const resultQuery = await clickhouse.query({
    query: getConversionRateQuery({
      teamId,
      projectId,
      componentId,
      splitId,
      from,
      to,
      timezone,
      period,
    }),
    query_params: getQueryParams(opts),
    format: "JSON",
  });
  const result = (await resultQuery.json<any>()).data as ConversionRateByTime[];
  if (!splitId) {
    return normalizeQueryResult(
      result,
      EMPTY_CONVERSION_RATE_EVENT,
      from,
      to,
      period
    );
  }
  const groupedBySlice = groupBy(result, "slice");
  return mapValues(groupedBySlice, (e) =>
    normalizeQueryResult(e, EMPTY_CONVERSION_RATE_EVENT, from, to, period)
  );
}

interface AnalyticsBillingQueryOpts {
  teamId?: string;
  projectId?: string;
  start: number;
  end: number;
}

export function buildRendersInTimestampRangeQuery(
  opts: AnalyticsBillingQueryOpts
) {
  return escapeQuery(`
select count(*) as renders
from events
where
  ${AnalyticsQueryConstants.IS_RENDER}
  ${filterByTeamId(opts.teamId)}
  ${filterByProjectId(opts.projectId)}
  ${filterByComponentId() /* Filter by root provider */}
  and toUnixTimestamp(timestamp) >= ${AnalyticsQueryConstants.START}
  and toUnixTimestamp(timestamp) <= ${AnalyticsQueryConstants.END}
  `);
}

export async function getRendersInTimestampRange(
  opts: AnalyticsBillingQueryOpts
) {
  const { start, end, projectId, teamId } = opts;
  const clickhouse = getClickHouseConnection();
  const resultQuery = await clickhouse.query({
    query: buildRendersInTimestampRangeQuery(opts),
    query_params: omitNils({
      start,
      end,
      componentId: AnalyticsQueryConstants.ROOT_PROVIDER,
      ...normalizeIds({ teamId, projectId }),
    }),
    format: "JSON",
  });
  const result = (await resultQuery.json<any>()).data as Array<{
    renders: number;
  }>;
  return result[0].renders ?? 0;
}

export async function getRecentlyTrackedProjectComponents(projectId: string) {
  const clickhouse = getClickHouseConnection();
  const resultQuery = await clickhouse.query({
    query: escapeQuery(
      `
select distinct JSONExtractString(events.properties, 'rootComponentId') as componentId from events
where timestamp >= now() - toIntervalDay(14)
${filterByRootProjectId()}
`
    ),
    query_params: {
      rootProjectId: projectId,
    },
    format: "JSON",
  });

  const result = (await resultQuery.json<any>()).data as Array<{
    componentId: string;
  }>;
  return result.map((res) => res.componentId);
}
