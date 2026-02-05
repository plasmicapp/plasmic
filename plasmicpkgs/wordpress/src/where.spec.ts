import { RulesLogic } from "json-logic-js";
import { describe, expect, it } from "vitest";
import { rulesLogicToWordPressFilters } from "./where";

describe("rulesLogicToWordPressFilters", () => {
  it("should convert all supported operators correctly", () => {
    expect(
      rulesLogicToWordPressFilters({
        "==": [{ var: "id" }, 1],
      })
    ).toEqual({ include: 1 });

    expect(
      rulesLogicToWordPressFilters({
        "!=": [{ var: "id" }, 1],
      })
    ).toEqual({ exclude: 1 });

    expect(
      rulesLogicToWordPressFilters({
        "<": [{ var: "date" }, "2026-01-08 14:09:06"],
      })
    ).toEqual({ before: "2026-01-08 14:09:06" });

    expect(
      rulesLogicToWordPressFilters({
        ">": [{ var: "date" }, "2026-01-08 14:09:06"],
      })
    ).toEqual({ after: "2026-01-08 14:09:06" });

    expect(
      rulesLogicToWordPressFilters({
        "<": [{ var: "modified" }, "2026-01-08 14:09:06"],
      })
    ).toEqual({ modified_before: "2026-01-08 14:09:06" });

    expect(
      rulesLogicToWordPressFilters({
        ">": [{ var: "modified" }, "2026-01-08 14:09:06"],
      })
    ).toEqual({ modified_after: "2026-01-08 14:09:06" });

    expect(
      rulesLogicToWordPressFilters({
        some: [
          { var: "categories" },
          {
            in: [{ var: "categories" }, [4]],
          },
        ],
      })
    ).toEqual({ categories: [4] });

    expect(
      rulesLogicToWordPressFilters({
        some: [
          { var: "tags" },
          {
            in: [{ var: "tags" }, [4, 6]],
          },
        ],
      })
    ).toEqual({ tags: [4, 6] });

    expect(
      rulesLogicToWordPressFilters({
        "!": {
          some: [
            { var: "categories" },
            {
              in: [{ var: "" }, [4]],
            },
          ],
        },
      })
    ).toEqual({ categories_exclude: [4] });

    expect(
      rulesLogicToWordPressFilters({
        "!": {
          some: [
            { var: "tags" },
            {
              in: [{ var: "" }, [5, 7]],
            },
          ],
        },
      })
    ).toEqual({ tags_exclude: [5, 7] });

    expect(
      rulesLogicToWordPressFilters({
        "==": [{ var: "sticky" }, true],
      })
    ).toEqual({ sticky: true });

    expect(
      rulesLogicToWordPressFilters({
        "==": [{ var: "sticky" }, false],
      })
    ).toEqual({ sticky: false });

    expect(
      rulesLogicToWordPressFilters({
        "==": [{ var: "author" }, 1],
      })
    ).toEqual({ author: 1 });

    expect(
      rulesLogicToWordPressFilters({
        "==": [{ var: "slug" }, "my-slug"],
      })
    ).toEqual({ slug: "my-slug" });

    expect(
      rulesLogicToWordPressFilters({
        "!=": [{ var: "author" }, 1],
      })
    ).toEqual({ author_exclude: 1 });

    expect(
      rulesLogicToWordPressFilters({
        "==": [{ var: "search" }, "hello world"],
      })
    ).toEqual({ search: "hello world" });

    expect(
      rulesLogicToWordPressFilters({
        some: [
          { var: "search_columns" },
          {
            in: [{ var: "" }, ["post_title", "post_content"]],
          },
        ],
      })
    ).toEqual({ search_columns: ["post_title", "post_content"] });

    expect(
      rulesLogicToWordPressFilters({
        "==": [{ var: "parent" }, 42],
      })
    ).toEqual({ parent: 42 });

    expect(
      rulesLogicToWordPressFilters({
        "!=": [{ var: "parent" }, 42],
      })
    ).toEqual({ parent_exclude: 42 });

    expect(
      rulesLogicToWordPressFilters({
        "==": [{ var: "menu_order" }, 5],
      })
    ).toEqual({ menu_order: 5 });
  });

  it("should handle empty array values", () => {
    expect(
      rulesLogicToWordPressFilters({
        some: [
          { var: "categories" },
          {
            in: [{ var: "" }, []],
          },
        ],
      })
    ).toEqual({ categories: [] });

    expect(
      rulesLogicToWordPressFilters({
        "!": {
          some: [
            { var: "tags" },
            {
              in: [{ var: "" }, []],
            },
          ],
        },
      })
    ).toEqual({ tags_exclude: [] });
  });

  it("should flatten AND conditions into single object", () => {
    const logic: RulesLogic = {
      and: [
        {
          "==": [{ var: "id" }, 2],
        },
        {
          "!=": [{ var: "id" }, 1],
        },
        {
          "<": [{ var: "date" }, "2026-01-08 14:09:06"],
        },
        {
          ">": [{ var: "date" }, "2026-01-28 14:09:11"],
        },
        {
          "<": [{ var: "modified" }, "2026-01-08 14:09:06"],
        },
        {
          ">": [{ var: "modified" }, "2026-01-28 14:09:11"],
        },
        {
          "==": [{ var: "slug" }, "post-slug"],
        },
        {
          "==": [{ var: "author" }, 1],
        },
        {
          "!=": [{ var: "author" }, 2],
        },
        {
          some: [
            { var: "categories" },
            {
              in: [{ var: "categories" }, [4]],
            },
          ],
        },
        {
          some: [
            { var: "tags" },
            {
              in: [{ var: "tags" }, [8, 9]],
            },
          ],
        },
        { "==": [{ var: "sticky" }, true] },
        { "==": [{ var: "sticky" }, false] },
      ],
    };

    const filters = rulesLogicToWordPressFilters(logic);
    expect(filters).toEqual({
      include: 2,
      exclude: 1,
      before: "2026-01-08 14:09:06",
      after: "2026-01-28 14:09:11",
      modified_before: "2026-01-08 14:09:06",
      modified_after: "2026-01-28 14:09:11",
      slug: "post-slug",
      author: 1,
      author_exclude: 2,
      categories: [4],
      tags: [8, 9],
      // sticky was specified twice in the json logic filters. The last one wins.
      sticky: false,
    });
  });

  it("should handle undefined logic", () => {
    const filters = rulesLogicToWordPressFilters(undefined);
    expect(filters).toEqual({});
  });
  it("should handle operators that are not supported", () => {
    expect(() => {
      rulesLogicToWordPressFilters({
        ">=": [{ var: "id" }, 1],
      });
    }).toThrow(
      'Unsupported WordPress filter condition: {">=":[{"var":"id"},1]}'
    );
  });
});
