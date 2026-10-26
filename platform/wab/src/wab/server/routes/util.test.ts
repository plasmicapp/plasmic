import {
  parseJsonQueryParam,
  parseQueryParams,
} from "@/wab/server/routes/util";
import { BadRequestError } from "@/wab/shared/ApiErrors/errors";

describe("parseQueryParams", () => {
  it("parses JSON query values", () => {
    expect(
      parseQueryParams({
        query: {
          projectId: '"project-id"',
          includeDeleted: "false",
          limit: "10",
          ids: '["one","two"]',
          filter: '{"name":"example"}',
          version: "null",
        },
      }),
    ).toEqual({
      projectId: "project-id",
      includeDeleted: false,
      limit: 10,
      ids: ["one", "two"],
      filter: { name: "example" },
      version: null,
    });
  });

  it.each(["unquoted-token", "", '["unfinished"'])(
    "rejects malformed JSON as a bad request: %s",
    (value) => {
      expect(() =>
        parseQueryParams({ query: { access_token: value } }),
      ).toThrow(
        new BadRequestError("Query parameter access_token must be valid JSON"),
      );
    },
  );

  it.each([{ value: ["1", "2"] }, { value: { nested: "true" } }])(
    "rejects query values that are not strings: %j",
    ({ value }) => {
      expect(() => parseQueryParams({ query: { ids: value } })).toThrow(
        new BadRequestError("Query parameter ids must be a JSON string"),
      );
    },
  );
});

describe("parseJsonQueryParam", () => {
  it("parses a single JSON query value", () => {
    expect(
      parseJsonQueryParam(
        { query: { branchId: '"b1"', x: "nope" } },
        "branchId",
      ),
    ).toEqual("b1");
  });

  it("rejects malformed JSON as a bad request", () => {
    expect(() =>
      parseJsonQueryParam({ query: { revisionId: "abc" } }, "revisionId"),
    ).toThrow(
      new BadRequestError("Query parameter revisionId must be valid JSON"),
    );
  });

  it("rejects missing or non-string values as a bad request", () => {
    expect(() => parseJsonQueryParam({ query: {} }, "branchId")).toThrow(
      new BadRequestError("Query parameter branchId must be a JSON string"),
    );
    expect(() =>
      parseJsonQueryParam({ query: { branchId: ["a", "b"] } }, "branchId"),
    ).toThrow(
      new BadRequestError("Query parameter branchId must be a JSON string"),
    );
  });
});
