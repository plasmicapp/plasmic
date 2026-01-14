import type { RulesLogic } from "json-logic-js";
import {
  rulesLogicToStrapiFilters,
  strapiFieldsToQueryBuilderConfig,
} from "./where";

describe("rulesLogicToStrapiFilters", () => {
  it("converts simple equality to Strapi filters", () => {
    const rulesLogic: RulesLogic = {
      "==": [{ var: "name" }, "John"],
    };
    expect(rulesLogicToStrapiFilters(rulesLogic)).toEqual({
      name: { $eq: "John" },
    });
  });

  it("converts not equal to Strapi filters", () => {
    const rulesLogic: RulesLogic = {
      "!=": [{ var: "status" }, "deleted"],
    };
    expect(rulesLogicToStrapiFilters(rulesLogic)).toEqual({
      status: { $ne: "deleted" },
    });
  });

  it("converts comparison operators to Strapi filters", () => {
    const rulesLogic: RulesLogic = {
      and: [
        { ">": [{ var: "age" }, 18] },
        { "<=": [{ var: "age" }, 65] },
        { "<": [{ var: "score" }, 100] },
        { ">=": [{ var: "score" }, 0] },
      ],
    };
    expect(rulesLogicToStrapiFilters(rulesLogic)).toEqual({
      $and: [
        { age: { $gt: 18 } },
        { age: { $lte: 65 } },
        { score: { $lt: 100 } },
        { score: { $gte: 0 } },
      ],
    });
  });

  it("converts in operator to Strapi filters", () => {
    expect(
      rulesLogicToStrapiFilters({ and: [{ in: ["Mairi", { var: "name" }] }] })
    ).toEqual({
      $and: [{ name: { $contains: "Mairi" } }],
    });
  });

  it("converts null and not null operators to Strapi filters", () => {
    expect(
      rulesLogicToStrapiFilters({ and: [{ "==": [{ var: "name" }, null] }] })
    ).toEqual({
      $and: [{ name: { $null: true } }],
    });
    expect(
      rulesLogicToStrapiFilters({ and: [{ "!=": [{ var: "name" }, null] }] })
    ).toEqual({
      $and: [{ name: { $notNull: true } }],
    });
  });

  it("converts complex JsonLogic query with and/or/not to Strapi filters", () => {
    const rulesLogic: RulesLogic = {
      and: [
        { "==": [{ var: "title" }, "Hello World"] },
        { ">": [{ var: "rating" }, 3] },
        {
          or: [
            { ">=": [{ var: "publishedAt" }, "2024-01-01"] },
            { "==": [{ var: "status" }, "draft"] },
          ],
        },
        { "!=": [{ var: "_id" }, "excluded-id"] },
        { "!": { "<": [{ var: "wordCount" }, 50] } },
      ],
    };
    expect(rulesLogicToStrapiFilters(rulesLogic)).toEqual({
      $and: [
        { title: { $eq: "Hello World" } },
        { rating: { $gt: 3 } },
        {
          $or: [
            { publishedAt: { $gte: "2024-01-01" } },
            { status: { $eq: "draft" } },
          ],
        },
        { _id: { $ne: "excluded-id" } },
        { $not: { wordCount: { $lt: 50 } } },
      ],
    });
  });

  it("returns undefined for null/undefined input", () => {
    expect(rulesLogicToStrapiFilters(null as any)).toBeUndefined();
    expect(rulesLogicToStrapiFilters(undefined)).toBeUndefined();
  });
});

describe("strapiFieldsToQueryBuilderConfig", () => {
  it("returns empty fields object for empty fields array", () => {
    expect(strapiFieldsToQueryBuilderConfig([])).toEqual({ fields: {} });
  });

  it("infers number type from sample data", () => {
    const result = strapiFieldsToQueryBuilderConfig(["age", "score"], {
      age: 25,
      score: 100,
    });
    expect(result.fields.age).toEqual({
      type: "number",
      label: "age",
      operators: [
        "equal",
        "not_equal",
        "less",
        "less_or_equal",
        "greater",
        "greater_or_equal",
        "is_null",
        "is_not_null",
      ],
    });
    expect(result.fields.score).toEqual({
      type: "number",
      label: "score",
      operators: [
        "equal",
        "not_equal",
        "less",
        "less_or_equal",
        "greater",
        "greater_or_equal",
        "is_null",
        "is_not_null",
      ],
    });
  });

  it("infers boolean type from sample data", () => {
    const result = strapiFieldsToQueryBuilderConfig(["isActive", "published"], {
      isActive: true,
      published: false,
    });
    expect(result.fields.isActive).toEqual({
      type: "boolean",
      label: "isActive",
    });
    expect(result.fields.published).toEqual({
      type: "boolean",
      label: "published",
    });
  });

  it("infers datetime type from date string sample data", () => {
    const result = strapiFieldsToQueryBuilderConfig(
      ["createdAt", "updatedAt"],
      {
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-12-31T23:59:59Z",
      }
    );
    expect(result.fields.createdAt).toEqual({
      type: "datetime",
      label: "createdAt",
      operators: [
        "equal",
        "not_equal",
        "less",
        "less_or_equal",
        "greater",
        "greater_or_equal",
        "is_null",
        "is_not_null",
      ],
    });
    expect(result.fields.updatedAt).toEqual({
      type: "datetime",
      label: "updatedAt",
      operators: [
        "equal",
        "not_equal",
        "less",
        "less_or_equal",
        "greater",
        "greater_or_equal",
        "is_null",
        "is_not_null",
      ],
    });
  });

  it("infers text type from non-date string sample data", () => {
    const result = strapiFieldsToQueryBuilderConfig(
      ["name", "title", "description"],
      { name: "John", title: "Hello", description: "World" }
    );
    expect(result.fields.name).toEqual({
      type: "text",
      label: "name",
      operators: [
        "equal",
        "not_equal",
        "like",
        "not_like",
        "is_null",
        "is_not_null",
      ],
    });
    expect(result.fields.title).toEqual({
      type: "text",
      label: "title",
      operators: [
        "equal",
        "not_equal",
        "like",
        "not_like",
        "is_null",
        "is_not_null",
      ],
    });
  });

  it("handles fields without sample data", () => {
    const result = strapiFieldsToQueryBuilderConfig(["age", "unknownField"], {
      age: 25,
    });
    expect(result.fields.age).toBeDefined();
    expect(result.fields.unknownField).toBeUndefined();
  });

  it("handles mixed field types", () => {
    const result = strapiFieldsToQueryBuilderConfig(
      ["name", "age", "isActive", "createdAt"],
      {
        name: "John",
        age: 25,
        isActive: true,
        createdAt: "2024-01-01T00:00:00Z",
      }
    );
    expect(result.fields.name?.type).toBe("text");
    expect(result.fields.age?.type).toBe("number");
    expect(result.fields.isActive?.type).toBe("boolean");
    expect(result.fields.createdAt?.type).toBe("datetime");
  });

  it("handles null and undefined sample values", () => {
    const result = strapiFieldsToQueryBuilderConfig(
      ["field1", "field2", "field3"],
      {
        field1: null,
        field2: undefined,
        field3: "value",
      }
    );
    // Fields with null/undefined should not be included
    expect(result.fields.field1).toBeUndefined();
    expect(result.fields.field2).toBeUndefined();
    expect(result.fields.field3?.type).toBe("text");
  });

  it("handles various date string formats", () => {
    const result = strapiFieldsToQueryBuilderConfig(
      ["date1", "date2", "date3", "notDate"],
      {
        date1: "2024-01-01T00:00:00Z",
        date2: "2024-01-01",
        date3: "2024-01-01T12:30:45.123Z",
        notDate: "not a date",
      }
    );
    expect(result.fields.date1?.type).toBe("datetime");
    expect(result.fields.date2?.type).toBe("datetime");
    expect(result.fields.date3?.type).toBe("datetime");
    expect(result.fields.notDate?.type).toBe("text");
  });

  it("handles empty sample data object", () => {
    const result = strapiFieldsToQueryBuilderConfig(["field1", "field2"], {});
    expect(result.fields.field1).toBeUndefined();
    expect(result.fields.field2).toBeUndefined();
  });

  it("handles missing sample data parameter", () => {
    const result = strapiFieldsToQueryBuilderConfig(["field1", "field2"]);
    expect(result.fields.field1).toBeUndefined();
    expect(result.fields.field2).toBeUndefined();
  });
});
