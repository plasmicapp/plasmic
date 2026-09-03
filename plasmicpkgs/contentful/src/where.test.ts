import { describe, expect, it } from "vitest";
import type { ContentTypeSchema } from "./schema";
import {
  rulesLogicToContentfulFilters,
  schemaToQueryBuilderConfig,
} from "./where";

describe("schemaToQueryBuilderConfig", () => {
  it("should map all supported field types correctly", () => {
    const schema: ContentTypeSchema = {
      sys: { id: "blogPost" },
      name: "Blog Post",
      fields: [
        {
          id: "title",
          name: "post title",
          type: "Text",
          required: true,
          localized: false,
          disabled: false,
        },
        {
          id: "slug",
          name: "slug",
          type: "Symbol",
          required: false,
          localized: false,
          disabled: false,
        },
        {
          id: "views",
          name: "view count",
          type: "Integer",
          required: false,
          localized: false,
          disabled: false,
        },
        {
          id: "rating",
          name: "rating",
          type: "Number",
          required: false,
          localized: false,
          disabled: false,
        },
        {
          id: "featured",
          name: "featured",
          type: "Boolean",
          required: false,
          localized: false,
          disabled: false,
        },
        {
          id: "publishedAt",
          name: "published at",
          type: "Date",
          required: false,
          localized: false,
          disabled: false,
        },
        {
          id: "richContent",
          name: "rich content",
          type: "RichText",
          required: false,
          localized: false,
          disabled: false,
        },
      ],
    };

    const config = schemaToQueryBuilderConfig(schema);

    // Text and Symbol fields
    expect(config.fields.title).toEqual({
      label: "Post title",
      type: "text",
      operators: ["equal", "not_equal", "like", "is_null", "is_not_null"],
    });
    expect(config.fields.slug).toEqual({
      label: "Slug",
      type: "text",
      operators: ["equal", "not_equal", "like", "is_null", "is_not_null"],
    });

    // Number fields
    expect(config.fields.views).toEqual({
      label: "View count",
      type: "number",
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
    expect(config.fields.rating).toEqual({
      label: "Rating",
      type: "number",
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

    // Boolean fields
    expect(config.fields.featured).toEqual({
      label: "Featured",
      type: "boolean",
    });

    // Date fields
    expect(config.fields.publishedAt).toEqual({
      label: "Published at",
      type: "datetime",
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

    // Unsupported field types should be excluded
    expect(config.fields.richContent).toBeUndefined();
  });

  it("should return empty fields for empty schema", () => {
    const schema: ContentTypeSchema = {
      sys: { id: "empty" },
      name: "Empty",
      fields: [],
    };

    const config = schemaToQueryBuilderConfig(schema);
    expect(config.fields).toEqual({});
  });
});

describe("rulesLogicToContentfulFilters", () => {
  it("should convert all supported operators correctly", () => {
    // Equality operators
    expect(
      rulesLogicToContentfulFilters({
        "==": [{ var: "status" }, "published"],
      })
    ).toEqual({ "fields.status": "published" });

    expect(
      rulesLogicToContentfulFilters({
        "!=": [{ var: "status" }, "draft"],
      })
    ).toEqual({ "fields.status[ne]": "draft" });

    // Null checks
    expect(
      rulesLogicToContentfulFilters({
        "==": [{ var: "author" }, null],
      })
    ).toEqual({ "fields.author[exists]": "false" });

    expect(
      rulesLogicToContentfulFilters({
        "!=": [{ var: "author" }, null],
      })
    ).toEqual({ "fields.author[exists]": "true" });

    // Comparison operators
    expect(
      rulesLogicToContentfulFilters({
        "<": [{ var: "price" }, 100],
      })
    ).toEqual({ "fields.price[lt]": 100 });

    expect(
      rulesLogicToContentfulFilters({
        "<=": [{ var: "age" }, 18],
      })
    ).toEqual({ "fields.age[lte]": 18 });

    expect(
      rulesLogicToContentfulFilters({
        ">": [{ var: "views" }, 1000],
      })
    ).toEqual({ "fields.views[gt]": 1000 });

    expect(
      rulesLogicToContentfulFilters({
        ">=": [{ var: "rating" }, 4.5],
      })
    ).toEqual({ "fields.rating[gte]": 4.5 });

    // Text search
    expect(
      rulesLogicToContentfulFilters({
        in: ["tutorial", { var: "title" }],
      })
    ).toEqual({ "fields.title[match]": "tutorial" });
  });

  it("should flatten AND conditions into single object", () => {
    const filters = rulesLogicToContentfulFilters({
      and: [
        { "==": [{ var: "status" }, "published"] },
        { ">": [{ var: "views" }, 100] },
        { "!=": [{ var: "author" }, null] },
        { in: ["tutorial", { var: "title" }] },
      ],
    });

    expect(filters).toEqual({
      "fields.status": "published",
      "fields.views[gt]": 100,
      "fields.author[exists]": "true",
      "fields.title[match]": "tutorial",
    });
  });

  it("should throw errors for unsupported operations", () => {
    // OR not supported
    expect(() => {
      rulesLogicToContentfulFilters({
        or: [
          { "==": [{ var: "category" }, "tech"] },
          { "==": [{ var: "category" }, "science"] },
        ],
      });
    }).toThrow("Contentful API does not support OR operations");

    // NOT not supported
    expect(() => {
      rulesLogicToContentfulFilters({
        "!": { "==": [{ var: "status" }, "draft"] },
      });
    }).toThrow("Contentful API does not support NOT operations");

    // Invalid logic
    expect(() => {
      rulesLogicToContentfulFilters("invalid" as any);
    }).toThrow("unexpected logic");

    expect(() => {
      rulesLogicToContentfulFilters({
        unsupported: [{ var: "field" }, "value"],
      } as any);
    }).toThrow("unexpected logic");
  });

  it("should handle edge cases", () => {
    expect(rulesLogicToContentfulFilters(undefined)).toEqual({});
    expect(rulesLogicToContentfulFilters(null as any)).toEqual({});
  });
});
