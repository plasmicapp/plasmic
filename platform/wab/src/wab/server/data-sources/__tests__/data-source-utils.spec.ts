import { DataSourceMeta } from "../../../shared/data-sources-meta/data-sources";
import { normalizeOperationTemplate } from "../data-source-utils";

describe("normalizing operation template", () => {
  const dataSourceMeta: DataSourceMeta = {
    id: "fake",
    label: "Fake data source",
    credentials: {},
    settings: {},
    studioOps: {},
    ops: [
      {
        name: "query",
        args: {
          filter1: {
            type: "filter[]",
            fields: () => ({}),
          },
          filter2: {
            type: "filter[]",
            fields: () => ({}),
            isSql: true,
          },
          resource: {
            type: "string",
          },
        },
        type: "read",
      },
      {
        name: "mutate",
        args: {
          resource: {
            type: "string",
          },
          variables: {
            type: "json-schema",
            fields: () => ({}),
          },
        },
        type: "write",
      },
    ],
  };
  it("works with int dynamic values", () => {
    expect(
      normalizeOperationTemplate(dataSourceMeta, {
        name: "query",
        roleId: "blah",
        templates: {
          // Replacing int dynamic value
          filter1: `{"tree":{"id":"bbbb989b-89ab-4cde-b012-318a800ad2dd","type":"group","properties":{"conjunction":"AND"},"children1":[{"type":"group","id":"989889a9-0123-4456-b89a-b18a800b0a95","properties":{"conjunction":"OR","not":false},"children1":[{"type":"rule","id":"b889bb9a-cdef-4012-b456-718a800b0a96","properties":{"field":"from_bucket_id","operator":"equal","value":[{{ ($props.fromBucketId) }}],"valueSrc":["value"],"valueType":["number-custom"]}},{"type":"rule","id":"a88ba8ba-89ab-4cde-b012-318a800b3bb5","properties":{"field":"to_bucket_id","operator":"equal","value":[{{ ($props.toBucketId) }}],"valueSrc":["value"],"valueType":["number-custom"]}}]}]},"fields":{"amount":{"type":"number","label":"amount"},"created_at":{"type":"datetime","label":"created_at"},"created_by":{"type":"text","label":"created_by"},"description":{"type":"text","label":"description"},"from_bucket_id":{"type":"number","label":"from_bucket_id"},"id":{"type":"number","label":"id"},"to_bucket_id":{"type":"number","label":"to_bucket_id"},"type":{"type":"text","label":"type"},"user_id":{"type":"text","label":"user_id"}}}`,
        },
      })
    ).toEqual({
      name: "query",
      roleId: "blah",
      templates: {
        // Replacing int dynamic value
        filter1: `{"tree":{"id":"$p$0","type":"group","properties":{"conjunction":"AND"},"children1":[{"type":"group","id":"$p$1","properties":{"conjunction":"OR","not":false},"children1":[{"type":"rule","id":"$p$2","properties":{"field":"from_bucket_id","operator":"equal","value":[{{ DYNAMIC0 }}],"valueSrc":["value"],"valueType":["number-custom"]}},{"type":"rule","id":"$p$3","properties":{"field":"to_bucket_id","operator":"equal","value":[{{ DYNAMIC1 }}],"valueSrc":["value"],"valueType":["number-custom"]}}]}]},"fields":{"amount":{"type":"number","label":"amount"},"created_at":{"type":"datetime","label":"created_at"},"created_by":{"type":"text","label":"created_by"},"description":{"type":"text","label":"description"},"from_bucket_id":{"type":"number","label":"from_bucket_id"},"id":{"type":"number","label":"id"},"to_bucket_id":{"type":"number","label":"to_bucket_id"},"type":{"type":"text","label":"type"},"user_id":{"type":"text","label":"user_id"}}}`,
      },
    });
  });

  it("works with string dynamic values", () => {
    expect(
      normalizeOperationTemplate(dataSourceMeta, {
        name: "query",
        roleId: "blah",
        templates: {
          filter1: `{"tree":{"id":"8aa88b88-cdef-4012-b456-718a863be333","type":"group","properties":{"conjunction":"AND"},"children1":[{"type":"rule","id":"cdef-4012-b456-718a863be534","properties":{"field":"id","operator":"equal","value":["{{ ($ctx.name) }}"],"valueSrc":["value"],"valueType":["text"]}}]},"fields":{"avatar":{"type":"text","label":"avatar"},"created_at":{"type":"datetime","label":"created_at"},"email":{"type":"text","label":"email"},"first_name":{"type":"text","label":"first_name"},"id":{"type":"text","label":"id"},"last_name":{"type":"text","label":"last_name"},"role":{"type":"text","label":"role"}}}`,
        },
      })
    ).toEqual({
      name: "query",
      roleId: "blah",
      templates: {
        // Replacing string dynamic value
        filter1: `{"tree":{"id":"$p$0","type":"group","properties":{"conjunction":"AND"},"children1":[{"type":"rule","id":"$p$1","properties":{"field":"id","operator":"equal","value":["{{ DYNAMIC0 }}"],"valueSrc":["value"],"valueType":["text"]}}]},"fields":{"avatar":{"type":"text","label":"avatar"},"created_at":{"type":"datetime","label":"created_at"},"email":{"type":"text","label":"email"},"first_name":{"type":"text","label":"first_name"},"id":{"type":"text","label":"id"},"last_name":{"type":"text","label":"last_name"},"role":{"type":"text","label":"role"}}}`,
      },
    });
  });

  it("works with sql statement", () => {
    expect(
      normalizeOperationTemplate(dataSourceMeta, {
        name: "query",
        roleId: "blah",
        templates: {
          // sql
          filter2: `SELECT\n  COUNT(*) AS user_signups\nFROM\n  users\nWHERE\n  signup_date > ({{ ($state.startDate.value) }}, '2000-01-01')::timestamp\n  AND signup_date <{{ ($state.endDate.value) }}`,
        },
      })
    ).toEqual({
      name: "query",
      roleId: "blah",
      templates: {
        // sql
        filter2: `SELECT\n  COUNT(*) AS user_signups\nFROM\n  users\nWHERE\n  signup_date > ({{ DYNAMIC0 }}, '2000-01-01')::timestamp\n  AND signup_date <{{ DYNAMIC1 }}`,
      },
    });
  });

  it("works with currentUser dynamic expressions", () => {
    expect(
      normalizeOperationTemplate(dataSourceMeta, {
        name: "query",
        roleId: "blah",
        templates: {
          resource: `Hello {{($ctx.number)}} and things you "{{ ($ctx.name) }}" but I cannot change {{(currentUser.email)}} or {{ (currentUser.customProperties.id) }} etc.!`,
        },
      })
    ).toEqual({
      name: "query",
      roleId: "blah",
      templates: {
        // Replacing string and non-string dynamic values, not filter[],
        // preserve currentUser
        resource: `Hello {{ DYNAMIC0 }} and things you "{{ DYNAMIC1 }}" but I cannot change {{(currentUser.email)}} or {{ (currentUser.customProperties.id) }} etc.!`,
      },
    });
  });

  it("works with many values", () => {
    expect(
      normalizeOperationTemplate(dataSourceMeta, {
        name: "mutate",
        roleId: null,
        templates: {
          variables: `{"amount":{{ ($state.form.value.amount) }},"to_bucket_id":{{ ($state.form.value.toBucketId) }},"user_id":"{{ (currentUser.customProperties.id) }}","description":"{{ ($state.form.value.description) }}"}`,
        },
      })
    ).toEqual({
      name: "mutate",
      roleId: null,
      templates: {
        variables: `{"amount":{{ DYNAMIC0 }},"to_bucket_id":{{ DYNAMIC1 }},"user_id":"{{ (currentUser.customProperties.id) }}","description":"{{ DYNAMIC2 }}"}`,
      },
    });
  });
});
