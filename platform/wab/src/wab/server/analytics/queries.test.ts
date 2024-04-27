import {
  AnalyticsQueryConstants,
  getConversionRateQuery,
  getImpressionsQuery,
} from "@/wab/server/analytics/queries";
import { Parser } from "node-sql-parser";

function fillQueryParams(query: string, PARAMS: Record<string, string>) {
  let result = query;
  Object.keys(PARAMS).forEach((param) => {
    const pattern = AnalyticsQueryConstants[param];
    result = result.replace(new RegExp(pattern, "g"), PARAMS[param]);
  });
  return result;
}

const PARAMS = {
  TEAM_ID: `'"gdYGJk5bkBPVEmFndhpoz4"'`,
  PROJECT_ID: `'"kjuFFTSZb8fanzCHT2C1jz"'`,
  TIMEZONE: "'America/Bahia'",
  FROM: "'2022-06-01 00:00:00'",
  TO: "'2022-07-30 23:59:99'",
  COMPONENT_ID: "'provider'",
  SPLIT_ID: "'splitId'",
};

function parseQuery(query: string) {
  const parser = new Parser();
  return parser.parse(query);
}

describe("Analytics queries", () => {
  describe("getImpressionsQuery", () => {
    it("should generate team impressions per day", () => {
      const result = fillQueryParams(
        getImpressionsQuery({
          teamId: PARAMS.TEAM_ID,
          from: PARAMS.FROM,
          to: PARAMS.TO,
          timezone: PARAMS.TIMEZONE,
          period: "day",
        }),
        PARAMS
      );
      expect(result).toMatchSnapshot();
      expect(() => parseQuery(result)).not.toThrow();
    });

    it("should generate team impressions per month", () => {
      const result = fillQueryParams(
        getImpressionsQuery({
          teamId: PARAMS.TEAM_ID,
          from: PARAMS.FROM,
          to: PARAMS.TO,
          timezone: PARAMS.TIMEZONE,
          period: "month",
        }),
        {
          ...PARAMS,
          FROM: "'2022-06-01'",
          TO: "'2022-07-30'",
        }
      );
      expect(result).toMatchSnapshot();
      expect(() => parseQuery(result)).not.toThrow();
    });

    it("should generate project impressions per day sliced", () => {
      const result = fillQueryParams(
        getImpressionsQuery({
          teamId: PARAMS.TEAM_ID,
          from: PARAMS.FROM,
          to: PARAMS.TO,
          timezone: PARAMS.TIMEZONE,
          projectId: PARAMS.PROJECT_ID,
          splitId: PARAMS.SPLIT_ID,
          period: "day",
        }),
        PARAMS
      );
      expect(result).toMatchSnapshot();
      expect(() => parseQuery(result)).not.toThrow();
    });

    it("should generate project impressions per month sliced", () => {
      const result = fillQueryParams(
        getImpressionsQuery({
          teamId: PARAMS.TEAM_ID,
          from: PARAMS.FROM,
          to: PARAMS.TO,
          timezone: PARAMS.TIMEZONE,
          projectId: PARAMS.PROJECT_ID,
          splitId: PARAMS.SPLIT_ID,
          period: "month",
        }),
        {
          ...PARAMS,
          FROM: "'2022-06-01'",
          TO: "'2022-07-30'",
        }
      );
      expect(result).toMatchSnapshot();
      expect(() => parseQuery(result)).not.toThrow();
    });
  });

  describe("getConversionRateQuery", () => {
    it("should generate team conversion rate per day", () => {
      const result = fillQueryParams(
        getConversionRateQuery({
          teamId: PARAMS.TEAM_ID,
          from: PARAMS.FROM,
          to: PARAMS.TO,
          timezone: PARAMS.TIMEZONE,
          period: "day",
        }),
        PARAMS
      );
      expect(result).toMatchSnapshot();
      expect(() => parseQuery(result)).not.toThrow();
    });

    it("should generate team conversion rate per month", () => {
      const result = fillQueryParams(
        getConversionRateQuery({
          teamId: PARAMS.TEAM_ID,
          from: PARAMS.FROM,
          to: PARAMS.TO,
          timezone: PARAMS.TIMEZONE,
          period: "month",
        }),
        {
          ...PARAMS,
          FROM: "'2022-06-01'",
          TO: "'2022-07-30'",
        }
      );
      expect(result).toMatchSnapshot();
      expect(() => parseQuery(result)).not.toThrow();
    });

    it("should generate project conversion rate per day sliced", () => {
      const result = fillQueryParams(
        getConversionRateQuery({
          teamId: PARAMS.TEAM_ID,
          from: PARAMS.FROM,
          to: PARAMS.TO,
          timezone: PARAMS.TIMEZONE,
          projectId: PARAMS.PROJECT_ID,
          splitId: PARAMS.SPLIT_ID,
          period: "day",
        }),
        PARAMS
      );
      expect(result).toMatchSnapshot();
      expect(() => parseQuery(result)).not.toThrow();
    });

    it("should generate project conversion rate per month sliced", () => {
      const result = fillQueryParams(
        getConversionRateQuery({
          teamId: PARAMS.TEAM_ID,
          from: PARAMS.FROM,
          to: PARAMS.TO,
          timezone: PARAMS.TIMEZONE,
          projectId: PARAMS.PROJECT_ID,
          splitId: PARAMS.SPLIT_ID,
          period: "month",
        }),
        {
          ...PARAMS,
          FROM: "'2022-06-01'",
          TO: "'2022-07-30'",
        }
      );
      expect(result).toMatchSnapshot();
      expect(() => parseQuery(result)).not.toThrow();
    });
  });
});
