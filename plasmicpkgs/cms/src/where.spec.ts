import type { RulesLogic } from "json-logic-js";
import { ApiCmsTable, CmsFieldMeta, CmsMetaType } from "./schema";
import { cmsTableToQueryBuilderConfig, rulesLogicToCmsWhere } from "./where";

describe("cmsTableToQueryBuilderConfig", () => {
  it("converts table without fields", () => {
    const table: ApiCmsTable = {
      identifier: "foo",
      name: "Foo",
      schema: { fields: [] },
    };
    expect(cmsTableToQueryBuilderConfig(table)).toEqual({
      fields: {
        _id: {
          type: "text",
          label: "System ID",
          operators: ["equal", "not_equal"],
        },
      },
    });
  });
  it("converts table with all field types", () => {
    const table: ApiCmsTable = {
      identifier: "blogPost",
      name: "Blog Post",
      schema: {
        fields: [
          {
            identifier: "title",
            type: CmsMetaType.TEXT,
          },
          {
            identifier: "content",
            label: "Content",
            type: CmsMetaType.RICH_TEXT,
          },
          {
            identifier: "wordCount",
            type: CmsMetaType.NUMBER,
          },
          {
            identifier: "show",
            label: "Is shown?",
            type: CmsMetaType.BOOLEAN,
          },
          {
            identifier: "type",
            type: CmsMetaType.ENUM,
            options: ["announcement", "marketing"],
          },
          {
            identifier: "publishedAt",
            type: CmsMetaType.DATE_TIME,
          },
        ] as CmsFieldMeta[],
      },
    };
    expect(cmsTableToQueryBuilderConfig(table)).toEqual({
      fields: {
        _id: {
          type: "text",
          label: "System ID",
          operators: ["equal", "not_equal"],
        },
        title: {
          type: "text",
          label: "title",
          operators: ["equal", "not_equal", "regex"],
        },
        wordCount: {
          type: "number",
          label: "wordCount",
          operators: [
            "equal",
            "not_equal",
            "less",
            "less_or_equal",
            "greater",
            "greater_or_equal",
          ],
        },
        show: {
          type: "boolean",
          label: "Is shown?",
        },
        type: {
          type: "select",
          label: "type",
          listValues: ["announcement", "marketing"],
          operators: ["select_equals", "select_not_equals", "select_any_in"],
        },
        publishedAt: {
          type: "datetime",
          label: "publishedAt",
          operators: [
            "equal",
            "not_equal",
            "less",
            "less_or_equal",
            "greater",
            "greater_or_equal",
          ],
        },
      },
    });
  });
});

describe("rulesLogicToCmsWhere", () => {
  it("converts complex JsonLogic query to CMS where clause", () => {
    const rulesLogic: RulesLogic = {
      and: [
        { "==": [{ var: "type" }, "announcement"] },
        { ">": [{ var: "wordCount" }, 100] },
        { "==": [{ var: "show" }, true] },
        {
          or: [
            { ">=": [{ var: "publishedAt" }, "2024-01-01"] },
            // @ts-expect-error regex is a custom operator
            { regex: [{ var: "title" }, "^Important"] },
          ],
        },
        { "!=": [{ var: "_id" }, "excluded-id"] },
        { in: [{ var: "type" }, ["announcement", "marketing"]] },
        { "!": { "<": [{ var: "wordCount" }, 50] } },
        { "<=": [{ var: "wordCount" }, 5000] },
      ],
    };
    expect(rulesLogicToCmsWhere(rulesLogic)).toEqual({
      $and: [
        { type: "announcement" },
        { wordCount: { $gt: 100 } },
        { show: true },
        {
          $or: [
            { publishedAt: { $ge: "2024-01-01" } },
            { title: { $regex: "^Important" } },
          ],
        },
        { $not: { _id: "excluded-id" } },
        { type: { $in: ["announcement", "marketing"] } },
        { $not: { wordCount: { $lt: 50 } } },
        { wordCount: { $le: 5000 } },
      ],
    });
  });
});
