import { PostgresFetcher } from "@/wab/server/data-sources/postgres-fetcher";
import { DataSourceError } from "@/wab/shared/data-sources-meta/data-sources";
import { DataSourceSchema } from "@plasmicapp/data-sources";

const SCHEMA: DataSourceSchema = {
  tables: [
    {
      id: "users",
      label: "users",
      fields: [
        {
          id: "id",
          label: "id",
          type: "number",
          readOnly: false,
          primaryKey: true,
        },
        {
          id: "name",
          label: "name",
          type: "string",
          readOnly: false,
          primaryKey: false,
        },
        {
          // A column name with double quote to verify identifier escaping.
          id: `weird"name`,
          label: "weird",
          type: "string",
          readOnly: false,
          primaryKey: false,
        },
      ],
    },
  ],
};

function makeFetcher() {
  const fetcher = new PostgresFetcher({
    credentials: { connectionString: "postgres://user:pass@localhost:5432/db" },
    settings: {},
  } as any);
  const queryMock = jest.fn().mockResolvedValue({ rows: [], fields: [] });
  // Inject a fake pool with schema so getList builds SQL without touching a real database.
  (fetcher as any).pool = { query: queryMock, connect: jest.fn() };
  (fetcher as any).schema = SCHEMA;
  return { fetcher, queryMock };
}

describe("PostgresFetcher.getList ORDER BY", () => {
  it("quotes a valid sort field", async () => {
    const { fetcher, queryMock } = makeFetcher();
    await fetcher.getList({
      resource: "users",
      sort: [{ field: "name", order: "asc" }],
    });
    const queryStr = queryMock.mock.calls[0][0] as string;
    expect(queryStr).toContain(`ORDER BY "name" ASC`);
  });

  it("escapes embedded double quotes in a valid sort field", async () => {
    const { fetcher, queryMock } = makeFetcher();
    await fetcher.getList({
      resource: "users",
      sort: [{ field: `weird"name`, order: "desc" }],
    });
    const queryStr = queryMock.mock.calls[0][0] as string;
    expect(queryStr).toContain(`ORDER BY "weird""name" DESC`);
  });

  it("rejects a stacked-query injection in the sort field", async () => {
    const { fetcher, queryMock } = makeFetcher();
    await expect(
      fetcher.getList({
        resource: "users",
        sort: [{ field: "1; SELECT pg_sleep(5); --", order: "asc" }],
      })
    ).rejects.toThrow(DataSourceError);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("rejects a subquery-based blind injection in the sort field", async () => {
    const { fetcher } = makeFetcher();
    await expect(
      fetcher.getList({
        resource: "users",
        sort: [{ field: "(SELECT 1 FROM pg_sleep(2))", order: "asc" }],
      })
    ).rejects.toThrow(/Invalid sort field/);
  });

  it("rejects a non-string sort field", async () => {
    const { fetcher } = makeFetcher();
    await expect(
      fetcher.getList({
        resource: "users",
        sort: [{ field: { evil: true } as any, order: "asc" }],
      })
    ).rejects.toThrow(DataSourceError);
  });
});
