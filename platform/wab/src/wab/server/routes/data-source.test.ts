import { DataSource } from "@/wab/server/entities/Entities";
import { mkApiDataSource } from "@/wab/server/routes/data-source";

function mkHttpDataSource(opts: {
  credentials?: Record<string, any>;
  settings?: Record<string, any>;
}): DataSource {
  return {
    id: "ds1",
    name: "My API",
    source: "http",
    credentials: opts.credentials ?? {},
    settings: { baseUrl: "https://api.example.com", ...opts.settings },
  } as unknown as DataSource;
}

describe("mkApiDataSource hasPrivateConfig", () => {
  it("is false for a vanilla integration, including the default Content-Type header", () => {
    // HTTP/GraphQL integrations are created with
    // `commonHeaders: { "Content-Type": "application/json" }` prefilled, so
    // treating that as private config would flag every vanilla integration.
    const api = mkApiDataSource(
      mkHttpDataSource({
        settings: { commonHeaders: { "Content-Type": "application/json" } },
      })
    );

    expect(api.hasPrivateConfig).toBe(false);
  });

  it("is true when a default header goes beyond the generated one", () => {
    const api = mkApiDataSource(
      mkHttpDataSource({
        settings: {
          commonHeaders: {
            "Content-Type": "application/json",
            Authorization: "Bearer hunter2",
          },
        },
      })
    );

    expect(api.hasPrivateConfig).toBe(true);
  });

  it("is true for hidden behavior-changing headers, even common ones", () => {
    // A custom Accept or a non-JSON Content-Type changes the response format
    // or body encoding; hiding it while reporting no private config would
    // silently change behavior after migration.
    expect(
      mkApiDataSource(
        mkHttpDataSource({
          settings: {
            commonHeaders: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          },
        })
      ).hasPrivateConfig
    ).toBe(true);
    expect(
      mkApiDataSource(
        mkHttpDataSource({
          settings: { commonHeaders: { Accept: "application/xml" } },
        })
      ).hasPrivateConfig
    ).toBe(true);
  });

  it("is true when legacy credentials carry headers", () => {
    const api = mkApiDataSource(
      mkHttpDataSource({
        credentials: { commonHeaders: { "X-Api-Key": "hunter2" } },
      })
    );

    expect(api.hasPrivateConfig).toBe(true);
  });

  it("is true for a generated default kept in credentials", () => {
    // Unlike settings, credentials are never sent, so migration can't copy it.
    const api = mkApiDataSource(
      mkHttpDataSource({
        credentials: {
          commonHeaders: { "Content-Type": "application/json" },
        },
      })
    );

    expect(api.hasPrivateConfig).toBe(true);
  });

  it("ignores unset values", () => {
    const api = mkApiDataSource(
      mkHttpDataSource({
        credentials: { commonHeaders: {} },
        settings: { commonHeaders: undefined },
      })
    );

    expect(api.hasPrivateConfig).toBe(false);
  });
});

describe("mkApiDataSource settings for non-editors", () => {
  it("keeps the generated default header visible so a migration can copy it", () => {
    const api = mkApiDataSource(
      mkHttpDataSource({
        settings: {
          commonHeaders: {
            "Content-Type": "application/json",
            Authorization: "Bearer hunter2",
          },
        },
      }),
      true
    );

    expect(api.settings).toEqual({
      baseUrl: "https://api.example.com",
      commonHeaders: { "Content-Type": "application/json" },
    });
  });

  it("omits commonHeaders without a generated default", () => {
    const api = mkApiDataSource(
      mkHttpDataSource({
        settings: { commonHeaders: { Authorization: "Bearer hunter2" } },
      }),
      true
    );

    expect(api.settings).toEqual({ baseUrl: "https://api.example.com" });
  });
});
