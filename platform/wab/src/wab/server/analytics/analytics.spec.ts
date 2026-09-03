import {
  getConversionRate,
  getConversions,
  getImpressions,
} from "@/wab/server/analytics/queries";
import { getClickHouseConnection } from "@/wab/server/clickhouse";

// test_db.events.team_id is a column created by posthog that have some constraint on it, it's not actually a project
// team id, we set a big team id for the queries executed in jest script so that we can easily distinguish this data
const getTID = () => Math.floor(Math.random() * 100000000) + 3000;

interface AnalyticsTestEvent {
  type: "$render" | "$conversion";
  properties: Record<string, any>;
  timestamp: string;
  distinct_id: string;
}

async function insertEvents(
  events: AnalyticsTestEvent[],
  testSuffix: string,
  tid: number
) {
  const values = events.map((event) => {
    const properties = {
      ...event.properties,
      // Add a suffix to allow multiple verify_plasmic running at the same time
      teamIds: [event.properties.teamIds[0] + testSuffix],
      projectIds: [event.properties.projectIds[0] + testSuffix],
    };
    return `(generateUUIDv4(), '${event.type}', '${JSON.stringify(
      properties
    )}', '${event.timestamp}', ${tid}, '${event.distinct_id}', '${
      event.timestamp
    }')`;
  });
  const query = `
insert into test_db.events (uuid, event, properties, timestamp, team_id, distinct_id, _timestamp)
values
  ${values.join(",\n")};
  `;
  const clickhouse = getClickHouseConnection();
  await clickhouse.query({
    query,
    format: "JSON",
  });
}

async function dropEvents(tid: number) {
  const clickhouse = getClickHouseConnection();
  await clickhouse.query({
    query: `alter table test_db.events delete where team_id = ${tid};`,
    format: "JSON",
  });
}

async function withEvents(
  events: AnalyticsTestEvent[],
  func: (suffix: string) => Promise<void>
) {
  const tid = getTID();
  const suffix = getRandomStr();

  console.log(
    `[analytics.test.ts/${new Date().toISOString()}] Setup analytics test with tid=${tid} suffix=${suffix}`
  );

  await insertEvents(events, suffix, tid);

  await func(suffix);

  await dropEvents(tid);
}

const getRandomStr = () => {
  return `${Math.floor(Math.random() * 1000000)}`;
};

const PLASMIC_WEBSITE_PROPERTIES_A = {
  teamIds: ["plasmic"],
  projectIds: ["website"],
  rootComponentId: "provider",
  split: "normal",
};

const PLASMIC_WEBSITE_PROPERTIES_B = {
  teamIds: ["plasmic"],
  projectIds: ["website"],
  rootComponentId: "provider",
  split: "override",
};

const PLASMIC_DASHBOARD_PROPERTIES = {
  teamIds: ["plasmic"],
  projectIds: ["dashboard"],
  rootComponentId: "provider",
  split: "normal",
};

const RENDER_DATA: AnalyticsTestEvent[] = [
  {
    type: "$render",
    properties: PLASMIC_WEBSITE_PROPERTIES_A,
    timestamp: "2022-01-01 00:00:00",
    distinct_id: "fmota",
  },
  {
    type: "$render",
    properties: PLASMIC_DASHBOARD_PROPERTIES,
    timestamp: "2022-01-01 00:00:01",
    distinct_id: "fmota",
  },
  {
    type: "$render",
    properties: PLASMIC_WEBSITE_PROPERTIES_B,
    timestamp: "2022-01-02 12:00:01",
    distinct_id: "fmota",
  },
  {
    type: "$render",
    properties: PLASMIC_WEBSITE_PROPERTIES_A,
    timestamp: "2022-01-01 00:00:00",
    distinct_id: "chung",
  },
  {
    type: "$render",
    properties: PLASMIC_WEBSITE_PROPERTIES_A,
    timestamp: "2022-01-02 00:00:00",
    distinct_id: "chung",
  },
  {
    type: "$render",
    properties: PLASMIC_WEBSITE_PROPERTIES_B,
    timestamp: "2022-01-01 00:00:00",
    distinct_id: "icaro",
  },
  {
    type: "$render",
    properties: PLASMIC_WEBSITE_PROPERTIES_B,
    timestamp: "2022-01-02 00:00:00",
    distinct_id: "victor",
  },
  {
    type: "$render",
    properties: PLASMIC_DASHBOARD_PROPERTIES,
    timestamp: "2022-02-01 00:00:00",
    distinct_id: "yang",
  },
  {
    type: "$render",
    properties: PLASMIC_DASHBOARD_PROPERTIES,
    timestamp: "2022-02-01 00:00:00",
    distinct_id: "samuel",
  },
];

const CONVERSION_RATE_DATA: AnalyticsTestEvent[] = [
  {
    type: "$render",
    properties: PLASMIC_WEBSITE_PROPERTIES_A,
    timestamp: "2022-01-01 00:00:00",
    distinct_id: "fmota",
  },
  {
    type: "$conversion",
    properties: {
      ...PLASMIC_WEBSITE_PROPERTIES_A,
      value: 500,
    },
    timestamp: "2022-01-01 20:59:59",
    distinct_id: "fmota",
  },
  {
    type: "$conversion",
    properties: {
      ...PLASMIC_WEBSITE_PROPERTIES_A,
      value: 500,
    },
    timestamp: "2022-01-01 21:59:59",
    distinct_id: "fmota",
  },
  {
    type: "$conversion",
    properties: {
      ...PLASMIC_WEBSITE_PROPERTIES_A,
      value: 500,
    },
    timestamp: "2022-01-01 23:59:59",
    distinct_id: "fmota",
  },
  {
    type: "$conversion",
    properties: {
      ...PLASMIC_WEBSITE_PROPERTIES_B,
      value: 500,
    },
    timestamp: "2022-01-02 00:00:00",
    distinct_id: "chung",
  },
  {
    type: "$render",
    properties: PLASMIC_WEBSITE_PROPERTIES_B,
    timestamp: "2022-01-02 20:59:59",
    distinct_id: "chung",
  },
  {
    type: "$render",
    properties: PLASMIC_WEBSITE_PROPERTIES_B,
    timestamp: "2022-01-02 23:59:59",
    distinct_id: "chung",
  },
  {
    type: "$render",
    properties: PLASMIC_WEBSITE_PROPERTIES_B,
    timestamp: "2022-01-03 00:00:00",
    distinct_id: "victor",
  },
  {
    type: "$conversion",
    properties: PLASMIC_WEBSITE_PROPERTIES_B,
    timestamp: "2022-01-04 00:00:00",
    distinct_id: "samuel",
  },
  {
    type: "$render",
    properties: PLASMIC_WEBSITE_PROPERTIES_B,
    timestamp: "2022-01-05 00:00:00",
    distinct_id: "tubone",
  },
  {
    type: "$conversion",
    properties: {
      ...PLASMIC_WEBSITE_PROPERTIES_B,
      value: 50,
    },
    timestamp: "2022-01-05 00:00:01",
    distinct_id: "tubone",
  },
];

describe.skip("Analytics", () => {
  describe("getImpressions", () => {
    it("should generate list of team impressions", () =>
      withEvents(RENDER_DATA, async (suffix) => {
        expect(
          await getImpressions({
            teamId: "plasmic" + suffix,
            from: "2022-01-01 00:00:00",
            to: "2022-01-02 23:59:59",
            timezone: "UTC",
            period: "day",
          })
        ).toMatchObject([
          expect.objectContaining({
            time: "2022-01-01 00:00:00",
            impressions: 4,
            unique_impressions: 3,
          }),
          expect.objectContaining({
            time: "2022-01-02 00:00:00",
            impressions: 3,
            unique_impressions: 3,
          }),
        ]);

        expect(
          await getImpressions({
            teamId: "plasmic" + suffix,
            from: "2022-01-01",
            to: "2022-03-01",
            timezone: "UTC",
            period: "month",
          })
        ).toMatchObject([
          expect.objectContaining({
            time: "2022-01-01",
            impressions: 7,
            unique_impressions: 4,
          }),
          expect.objectContaining({
            time: "2022-02-01",
            impressions: 2,
            unique_impressions: 2,
          }),
          expect.objectContaining({
            time: "2022-03-01",
            impressions: 0,
            unique_impressions: 0,
          }),
        ]);
      }));

    it("should generate list of project impressions", () =>
      withEvents(RENDER_DATA, async (suffix: string) => {
        expect(
          await getImpressions({
            teamId: "plasmic" + suffix,
            projectId: "website" + suffix,
            from: "2022-01-01 00:00:00",
            to: "2022-01-02 23:59:59",
            timezone: "UTC",
            period: "day",
          })
        ).toMatchObject([
          expect.objectContaining({
            time: "2022-01-01 00:00:00",
            impressions: 3,
            unique_impressions: 3,
          }),
          expect.objectContaining({
            time: "2022-01-02 00:00:00",
            impressions: 3,
            unique_impressions: 3,
          }),
        ]);

        expect(
          await getImpressions({
            teamId: "plasmic" + suffix,
            projectId: "website" + suffix,
            from: "2022-01-01",
            to: "2022-03-01",
            timezone: "UTC",
            period: "month",
          })
        ).toMatchObject([
          expect.objectContaining({
            time: "2022-01-01",
            impressions: 6,
            unique_impressions: 4,
          }),
          expect.objectContaining({
            time: "2022-02-01",
            impressions: 0,
            unique_impressions: 0,
          }),
          expect.objectContaining({
            time: "2022-03-01",
            impressions: 0,
            unique_impressions: 0,
          }),
        ]);

        expect(
          await getImpressions({
            teamId: "plasmic" + suffix,
            projectId: "dashboard" + suffix,
            from: "2021-12-31",
            to: "2022-02-01",
            timezone: "UTC",
            period: "month",
          })
        ).toMatchObject([
          expect.objectContaining({
            time: "2021-12-01",
            impressions: 0,
            unique_impressions: 0,
          }),
          expect.objectContaining({
            time: "2022-01-01",
            impressions: 1,
            unique_impressions: 1,
          }),
          expect.objectContaining({
            time: "2022-02-01",
            impressions: 2,
            unique_impressions: 2,
          }),
        ]);
      }));

    it("should generate list of project impressions based on split", () =>
      withEvents(RENDER_DATA, async (suffix) => {
        expect(
          await getImpressions({
            teamId: "plasmic" + suffix,
            projectId: "website" + suffix,
            from: "2022-01-01 00:00:00",
            to: "2022-01-02 23:59:59",
            timezone: "UTC",
            period: "day",
            splitId: "split",
          })
        ).toMatchObject({
          normal: [
            expect.objectContaining({
              time: "2022-01-01 00:00:00",
              impressions: 2,
              unique_impressions: 2,
            }),
            expect.objectContaining({
              time: "2022-01-02 00:00:00",
              impressions: 1,
              unique_impressions: 1,
            }),
          ],
          override: [
            expect.objectContaining({
              time: "2022-01-01 00:00:00",
              impressions: 1,
              unique_impressions: 1,
            }),
            expect.objectContaining({
              time: "2022-01-02 00:00:00",
              impressions: 2,
              unique_impressions: 2,
            }),
          ],
        });

        expect(
          await getImpressions({
            teamId: "plasmic" + suffix,
            projectId: "website" + suffix,
            from: "2022-01-01",
            to: "2022-02-01",
            timezone: "UTC",
            period: "month",
            splitId: "split",
          })
        ).toMatchObject({
          normal: [
            expect.objectContaining({
              time: "2022-01-01",
              impressions: 3,
              unique_impressions: 2,
            }),
            expect.objectContaining({
              time: "2022-02-01",
              impressions: 0,
              unique_impressions: 0,
            }),
          ],
          override: [
            expect.objectContaining({
              time: "2022-01-01",
              impressions: 3,
              unique_impressions: 3,
            }),
            expect.objectContaining({
              time: "2022-02-01",
              impressions: 0,
              unique_impressions: 0,
            }),
          ],
        });
      }));

    it("should adjust events based on timezone", () =>
      withEvents(RENDER_DATA, async (suffix) => {
        /**
      Events stored in UTC = GMT 0
      America/Bahia = GMT -3
      Pacific/Auckland = GMT +12
       */

        expect(
          await getImpressions({
            teamId: "plasmic" + suffix,
            from: "2022-01-01 00:00:00",
            to: "2022-01-02 23:59:59",
            timezone: "America/Bahia",
            period: "day",
          })
        ).toMatchObject([
          expect.objectContaining({
            time: "2022-01-01 00:00:00",
            impressions: 2,
            unique_impressions: 2,
          }),
          expect.objectContaining({
            time: "2022-01-02 00:00:00",
            impressions: 1,
            unique_impressions: 1,
          }),
        ]);

        expect(
          await getImpressions({
            teamId: "plasmic" + suffix,
            from: "2022-01-01 00:00:00",
            to: "2022-01-03 23:59:59",
            timezone: "Pacific/Auckland",
            period: "day",
          })
        ).toMatchObject([
          expect.objectContaining({
            time: "2022-01-01 00:00:00",
            impressions: 4,
            unique_impressions: 3,
          }),
          expect.objectContaining({
            time: "2022-01-02 00:00:00",
            impressions: 2,
            unique_impressions: 2,
          }),
          expect.objectContaining({
            time: "2022-01-03 00:00:00",
            impressions: 1,
            unique_impressions: 1,
          }),
        ]);
      }));
  });

  describe("getConversionRate", () => {
    it("should handle conversion rate based on order of events", () =>
      withEvents(CONVERSION_RATE_DATA, async (suffix) => {
        expect(
          await getConversionRate({
            teamId: "plasmic" + suffix,
            projectId: "website" + suffix,
            from: "2022-01-01 00:00:00",
            to: "2022-01-01 23:59:59",
            timezone: "UTC",
            period: "day",
          })
        ).toMatchObject([
          {
            time: "2022-01-01 00:00:00",
            conversion_rate: 1,
            renders: 1,
            conversions: 1,
          },
        ]);

        expect(
          await getConversionRate({
            teamId: "plasmic" + suffix,
            projectId: "website" + suffix,
            from: "2022-01-02 00:00:00",
            to: "2022-01-02 23:59:59",
            timezone: "UTC",
            period: "day",
          })
        ).toMatchObject([
          {
            time: "2022-01-02 00:00:00",
            conversion_rate: 0,
            renders: 1,
            conversions: 0,
          },
        ]);

        expect(
          await getConversionRate({
            teamId: "plasmic" + suffix,
            projectId: "website" + suffix,
            from: "2022-01-03 00:00:00",
            to: "2022-01-03 23:59:59",
            timezone: "UTC",
            period: "day",
          })
        ).toMatchObject([
          {
            time: "2022-01-03 00:00:00",
            conversion_rate: 0,
            renders: 1,
            conversions: 0,
          },
        ]);

        expect(
          await getConversionRate({
            teamId: "plasmic" + suffix,
            projectId: "website" + suffix,
            from: "2022-01-04 00:00:00",
            to: "2022-01-04 23:59:59",
            timezone: "UTC",
            period: "day",
          })
        ).toMatchObject([
          {
            time: "2022-01-04 00:00:00",
            conversion_rate: 0,
            renders: 0,
            conversions: 0,
          },
        ]);

        expect(
          await getConversionRate({
            teamId: "plasmic" + suffix,
            projectId: "website" + suffix,
            from: "2022-01-05 00:00:00",
            to: "2022-01-05 23:59:59",
            timezone: "UTC",
            period: "day",
          })
        ).toMatchObject([
          {
            time: "2022-01-05 00:00:00",
            conversion_rate: 1,
            renders: 1,
            conversions: 1,
          },
        ]);

        expect(
          await getConversionRate({
            teamId: "plasmic" + suffix,
            projectId: "website" + suffix,
            from: "2022-01-05",
            to: "2022-02-05",
            timezone: "UTC",
            period: "month",
          })
        ).toMatchObject([
          {
            time: "2022-01-01",
            conversion_rate: 0.5,
            renders: 4,
            conversions: 2,
          },
          {
            time: "2022-02-01",
            conversion_rate: 0,
            renders: 0,
            conversions: 0,
          },
        ]);
      }));

    it("should list conversion rate by split", () =>
      withEvents(CONVERSION_RATE_DATA, async (suffix) => {
        expect(
          await getConversionRate({
            teamId: "plasmic" + suffix,
            projectId: "website" + suffix,
            from: "2022-01-05",
            to: "2022-02-05",
            timezone: "UTC",
            period: "month",
            splitId: "split",
          })
        ).toMatchObject({
          normal: [
            {
              time: "2022-01-01",
              conversion_rate: 1,
              renders: 1,
              conversions: 1,
            },
            {
              time: "2022-02-01",
              conversion_rate: 0,
              renders: 0,
              conversions: 0,
            },
          ],
          override: [
            {
              time: "2022-01-01",
              conversion_rate: 1 / 3,
              renders: 3,
              conversions: 1,
            },
            {
              time: "2022-02-01",
              conversion_rate: 0,
              renders: 0,
              conversions: 0,
            },
          ],
        });
      }));

    it("should throw if there projectId is not defined", () =>
      withEvents(CONVERSION_RATE_DATA, async (suffix) => {
        await expect(
          getConversionRate({
            teamId: "plasmic" + suffix,
            from: "2022-01-01 00:00:00",
            to: "2022-01-01 23:59:59",
            timezone: "UTC",
            period: "day",
          })
        ).rejects.toThrow("Unsupported operation");
      }));
  });

  describe("getConversions", () => {
    it("should generate list of project conversions", () =>
      withEvents(CONVERSION_RATE_DATA, async (suffix) => {
        expect(
          await getConversions({
            teamId: "plasmic" + suffix,
            projectId: "website" + suffix,
            from: "2022-01-01 00:00:00",
            to: "2022-01-05 23:59:59",
            timezone: "UTC",
            period: "day",
          })
        ).toMatchObject([
          expect.objectContaining({
            time: "2022-01-01 00:00:00",
            conversions: 3,
            conversion_amount: 1500,
          }),
          expect.objectContaining({
            time: "2022-01-02 00:00:00",
            conversions: 1,
            conversion_amount: 500,
          }),
          expect.objectContaining({
            time: "2022-01-03 00:00:00",
            conversions: 0,
            conversion_amount: 0,
          }),
          expect.objectContaining({
            time: "2022-01-04 00:00:00",
            conversions: 1,
            conversion_amount: 0,
          }),
          expect.objectContaining({
            time: "2022-01-05 00:00:00",
            conversions: 1,
            conversion_amount: 50,
          }),
        ]);
      }));

    it("should throw if there projectId is not defined", () =>
      withEvents(CONVERSION_RATE_DATA, async (suffix) => {
        await expect(
          getConversions({
            teamId: "plasmic" + suffix,
            from: "2022-01-01 00:00:00",
            to: "2022-01-01 23:59:59",
            timezone: "UTC",
            period: "day",
          })
        ).rejects.toThrow("Unsupported operation");
      }));
  });
});
