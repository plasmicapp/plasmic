import { parseQueryParams } from "@/wab/server/routes/util";
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
      })
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
        parseQueryParams({ query: { access_token: value } })
      ).toThrow(
        new BadRequestError("Query parameter access_token must be valid JSON")
      );
    }
  );

  it.each([{ value: ["1", "2"] }, { value: { nested: "true" } }])(
    "rejects query values that are not strings: %j",
    ({ value }) => {
      expect(() => parseQueryParams({ query: { ids: value } })).toThrow(
        new BadRequestError("Query parameter ids must be a JSON string")
      );
    }
  );
});
