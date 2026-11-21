import { beforeEach, describe, expect, it, vi } from "vitest";
import { Api, ProjectMeta, transformApiLoaderBundleOutput } from "./api";

describe("Api", () => {
  describe("transformApiLoaderBundleOutput", () => {
    it("should create filteredIds object", () => {
      const bundle = {
        modules: {
          browser: [],
          server: [],
        },
        components: [],
        globalGroups: [],
        projects: [
          {
            id: "project1",
          } as ProjectMeta,
          {
            id: "project2",
          } as ProjectMeta,
          {
            id: "project3",
          } as ProjectMeta,
        ],
        activeSplits: [],
        bundleKey: "",
        deferChunksByDefault: true,
        disableRootLoadingBoundaryByDefault: true,
      };

      expect(transformApiLoaderBundleOutput(bundle)).toMatchObject({
        ...bundle,
        filteredIds: {
          project1: [],
          project3: [],
        },
      });
    });
  });

  describe("fetchLoaderData", () => {
    const mockBundle = {
      modules: { browser: [], server: [] },
      components: [],
      globalGroups: [],
      projects: [],
      activeSplits: [],
      bundleKey: null,
      deferChunksByDefault: false,
      disableRootLoadingBoundaryByDefault: false,
    };

    let api: Api;

    const mockResponse = (status: number, body: any) => ({
      status,
      text: async () => JSON.stringify(body),
      headers: { get: (_key: string) => null },
    });

    const redirectResponse = (status: number, location: string) => ({
      status,
      headers: {
        get: (key: string) => (key === "location" ? location : null),
      },
    });

    describe("fetch without useLastResponse", () => {
      beforeEach(() => {
        api = new Api({
          projects: [{ id: "test", token: "token" }],
          nativeFetch: false,
          manualRedirect: false,
        });
      });

      it("should handle normal 200 response", async () => {
        const mockFetch = vi
          .fn()
          .mockResolvedValue(mockResponse(200, mockBundle));
        (api as any).fetch = mockFetch;

        const result = await api.fetchLoaderData(["test"], {});

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(result).toMatchObject(mockBundle);
      });

      it("should handle 200 response with redirectUrl", async () => {
        const mockFetch = vi
          .fn()
          .mockResolvedValueOnce(
            mockResponse(200, { redirectUrl: "/versioned?cb=123" }),
          )
          .mockResolvedValueOnce(mockResponse(200, mockBundle));
        (api as any).fetch = mockFetch;

        const result = await api.fetchLoaderData(["test"], {});

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(mockFetch).toHaveBeenNthCalledWith(
          2,
          "https://codegen.plasmic.app/versioned?cb=123",
          expect.any(Object),
        );
        expect(result).toMatchObject(mockBundle);
      });

      it("should throw error on initial fetch failure", async () => {
        (api as any).fetch = vi
          .fn()
          .mockResolvedValue(
            mockResponse(400, { error: { message: "Bad request" } }),
          );

        await expect(api.fetchLoaderData(["test"], {})).rejects.toThrow(
          "Bad request",
        );
      });

      it("should not fall back on a published 404", async () => {
        const mockFetch = vi
          .fn()
          .mockResolvedValue(
            mockResponse(404, { error: { message: "Not found" } }),
          );
        (api as any).fetch = mockFetch;

        await expect(api.fetchLoaderData(["test"], {})).rejects.toThrow(
          "Not found",
        );
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it("should throw error after redirectUrl fetch failure", async () => {
        const mockFetch = vi
          .fn()
          .mockResolvedValueOnce(
            mockResponse(200, { redirectUrl: "/versioned" }),
          )
          .mockResolvedValueOnce(
            mockResponse(500, { error: { message: "Server error" } }),
          );
        (api as any).fetch = mockFetch;

        await expect(api.fetchLoaderData(["test"], {})).rejects.toThrow(
          "Server error",
        );
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    describe("fetch with useLastResponse", () => {
      beforeEach(() => {
        api = new Api({
          projects: [{ id: "test", token: "token" }],
          nativeFetch: false,
          manualRedirect: true,
        });
      });

      it("should handle 301 redirect", async () => {
        const mockFetch = vi
          .fn()
          .mockResolvedValueOnce({
            status: 301,
            headers: {
              get: (key: string) => (key === "location" ? "/versioned" : null),
            },
          })
          .mockResolvedValueOnce(mockResponse(200, mockBundle));
        (api as any).fetch = mockFetch;

        const result = await api.fetchLoaderData(["test"], {});

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result).toMatchObject(mockBundle);
      });

      it("should throw error if redirect expected but not received", async () => {
        const mockFetch = vi
          .fn()
          .mockResolvedValue(mockResponse(200, mockBundle));
        (api as any).fetch = mockFetch;

        await expect(api.fetchLoaderData(["test"], {})).rejects.toThrow(
          "redirect was expected",
        );
      });

      it("should throw error if redirect has no location header", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
          status: 301,
          headers: { get: () => null },
        });
        (api as any).fetch = mockFetch;

        await expect(api.fetchLoaderData(["test"], {})).rejects.toThrow(
          "no location header",
        );
      });

      it("should reuse cached response for same redirect location", async () => {
        const mockFetch = vi
          .fn()
          .mockResolvedValueOnce({
            status: 301,
            headers: {
              get: (key: string) => (key === "location" ? "/versioned" : null),
            },
          })
          .mockResolvedValueOnce(mockResponse(200, mockBundle))
          .mockResolvedValueOnce({
            status: 301,
            headers: {
              get: (key: string) => (key === "location" ? "/versioned" : null),
            },
          });
        (api as any).fetch = mockFetch;

        await api.fetchLoaderData(["test"], {});
        const result = await api.fetchLoaderData(["test"], {});

        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(result).toMatchObject(mockBundle);
      });

      it("should throw error on versioned redirect fetch failure", async () => {
        const mockFetch = vi
          .fn()
          .mockResolvedValueOnce({
            status: 302,
            headers: {
              get: (key: string) => (key === "location" ? "/versioned" : null),
            },
          })
          .mockResolvedValueOnce(
            mockResponse(404, { error: { message: "Not found" } }),
          );
        (api as any).fetch = mockFetch;

        await expect(api.fetchLoaderData(["test"], {})).rejects.toThrow(
          "Not found",
        );
      });

      it("should resolve an absolute Location for published", async () => {
        const absolute =
          "https://other.example.com/api/v1/loader/code/versioned?projectId=test%401.0.0";
        const mockFetch = vi
          .fn()
          .mockResolvedValueOnce(redirectResponse(302, absolute))
          .mockResolvedValueOnce(mockResponse(200, mockBundle));
        (api as any).fetch = mockFetch;

        const result = await api.fetchLoaderData(["test"], {});

        expect(mockFetch).toHaveBeenNthCalledWith(
          1,
          "https://codegen.plasmic.app/api/v1/loader/code/published?platform=react&projectId=test",
          expect.objectContaining({ redirect: "manual" }),
        );
        expect(mockFetch).toHaveBeenNthCalledWith(
          2,
          absolute,
          expect.any(Object),
        );
        expect(result).toMatchObject(mockBundle);
      });
    });

    describe("preview", () => {
      const previewUrl = (host: string, extra = "") =>
        `${host}/api/v1/loader/code/revision/latest?platform=react&projectId=test&loaderVersion=10${extra}`;
      const revisionPath =
        "/api/v1/loader/code/revision?cb=1&platform=react&loaderVersion=10&projectId=test%40rev%3Aabc";

      describe("with manual redirect (Node default)", () => {
        beforeEach(() => {
          api = new Api({
            projects: [{ id: "test", token: "token" }],
          });
        });

        it("should request revision/latest on the CDN host", async () => {
          const mockFetch = vi
            .fn()
            .mockResolvedValueOnce(redirectResponse(302, revisionPath))
            .mockResolvedValueOnce(mockResponse(200, mockBundle));
          (api as any).fetch = mockFetch;

          await api.fetchLoaderData(["test"], { preview: true });

          expect(mockFetch).toHaveBeenNthCalledWith(
            1,
            previewUrl("https://codegen.plasmic.app"),
            expect.objectContaining({
              redirect: "manual",
              headers: expect.objectContaining({
                "x-plasmic-loader-version": "10",
                "x-plasmic-api-project-tokens": "test:token",
              }),
            }),
          );
        });

        it("should follow a relative Location", async () => {
          const mockFetch = vi
            .fn()
            .mockResolvedValueOnce(redirectResponse(302, revisionPath))
            .mockResolvedValueOnce(mockResponse(200, mockBundle));
          (api as any).fetch = mockFetch;

          const result = await api.fetchLoaderData(["test"], {
            preview: true,
          });

          expect(mockFetch).toHaveBeenCalledTimes(2);
          expect(mockFetch).toHaveBeenNthCalledWith(
            2,
            `https://codegen.plasmic.app${revisionPath}`,
            expect.objectContaining({
              headers: expect.objectContaining({
                "x-plasmic-api-project-tokens": "test:token",
              }),
            }),
          );
          expect(result).toMatchObject(mockBundle);
        });

        it("should follow an absolute Location", async () => {
          const absolute = `https://cdn.example.com${revisionPath}`;
          const mockFetch = vi
            .fn()
            .mockResolvedValueOnce(redirectResponse(302, absolute))
            .mockResolvedValueOnce(mockResponse(200, mockBundle));
          (api as any).fetch = mockFetch;

          const result = await api.fetchLoaderData(["test"], {
            preview: true,
          });

          expect(mockFetch).toHaveBeenNthCalledWith(
            2,
            absolute,
            expect.any(Object),
          );
          expect(result).toMatchObject(mockBundle);
        });

        it("should reuse the last bundle when Location is unchanged", async () => {
          const mockFetch = vi
            .fn()
            .mockResolvedValueOnce(redirectResponse(302, revisionPath))
            .mockResolvedValueOnce(mockResponse(200, mockBundle))
            .mockResolvedValueOnce(redirectResponse(302, revisionPath));
          (api as any).fetch = mockFetch;

          const first = await api.fetchLoaderData(["test"], { preview: true });
          const second = await api.fetchLoaderData(["test"], {
            preview: true,
          });

          expect(mockFetch).toHaveBeenCalledTimes(3);
          expect(second).toBe(first);
        });

        it("should refetch when Location changes", async () => {
          const nextPath = revisionPath.replace("abc", "def");
          const mockFetch = vi
            .fn()
            .mockResolvedValueOnce(redirectResponse(302, revisionPath))
            .mockResolvedValueOnce(mockResponse(200, mockBundle))
            .mockResolvedValueOnce(redirectResponse(302, nextPath))
            .mockResolvedValueOnce(mockResponse(200, mockBundle));
          (api as any).fetch = mockFetch;

          await api.fetchLoaderData(["test"], { preview: true });
          await api.fetchLoaderData(["test"], { preview: true });

          expect(mockFetch).toHaveBeenCalledTimes(4);
          expect(mockFetch).toHaveBeenNthCalledWith(
            4,
            `https://codegen.plasmic.app${nextPath}`,
            expect.any(Object),
          );
        });

        it("should accept a 200 full bundle (server-side rollback)", async () => {
          const mockFetch = vi
            .fn()
            .mockResolvedValue(mockResponse(200, mockBundle));
          (api as any).fetch = mockFetch;

          const result = await api.fetchLoaderData(["test"], {
            preview: true,
          });

          expect(mockFetch).toHaveBeenCalledTimes(1);
          expect(result).toMatchObject(mockBundle);
        });

        it("should follow a 200 {redirectUrl}", async () => {
          const mockFetch = vi
            .fn()
            .mockResolvedValueOnce(
              mockResponse(200, { redirectUrl: revisionPath }),
            )
            .mockResolvedValueOnce(mockResponse(200, mockBundle));
          (api as any).fetch = mockFetch;

          const result = await api.fetchLoaderData(["test"], {
            preview: true,
          });

          expect(mockFetch).toHaveBeenNthCalledWith(
            2,
            `https://codegen.plasmic.app${revisionPath}`,
            expect.any(Object),
          );
          expect(result).toMatchObject(mockBundle);
        });

        it("should surface errors from the redirect route", async () => {
          (api as any).fetch = vi
            .fn()
            .mockResolvedValue(
              mockResponse(403, { error: { message: "Forbidden" } }),
            );

          await expect(
            api.fetchLoaderData(["test"], { preview: true }),
          ).rejects.toThrow("Forbidden");
        });

        it.each([307, 308])("should follow a %i redirect", async (status) => {
          const mockFetch = vi
            .fn()
            .mockResolvedValueOnce(redirectResponse(status, revisionPath))
            .mockResolvedValueOnce(mockResponse(200, mockBundle));
          (api as any).fetch = mockFetch;

          const result = await api.fetchLoaderData(["test"], {
            preview: true,
          });

          expect(mockFetch).toHaveBeenNthCalledWith(
            2,
            `https://codegen.plasmic.app${revisionPath}`,
            expect.any(Object),
          );
          expect(result).toMatchObject(mockBundle);
        });

        it("should fall back to /code/preview once on a 404, and remember it", async () => {
          const mockFetch = vi
            .fn()
            .mockResolvedValueOnce(
              mockResponse(404, { error: { message: "Not found" } }),
            )
            .mockResolvedValueOnce(mockResponse(200, mockBundle))
            .mockResolvedValueOnce(mockResponse(200, mockBundle));
          (api as any).fetch = mockFetch;

          const result = await api.fetchLoaderData(["test"], {
            preview: true,
          });
          await api.fetchLoaderData(["test"], { preview: true });

          const legacyUrl =
            "https://codegen.plasmic.app/api/v1/loader/code/preview?platform=react&projectId=test&loaderVersion=10";
          expect(mockFetch).toHaveBeenCalledTimes(3);
          expect(mockFetch).toHaveBeenNthCalledWith(
            1,
            previewUrl("https://codegen.plasmic.app"),
            expect.any(Object),
          );
          expect(mockFetch).toHaveBeenNthCalledWith(
            2,
            legacyUrl,
            expect.any(Object),
          );
          expect(mockFetch).toHaveBeenNthCalledWith(
            3,
            legacyUrl,
            expect.any(Object),
          );
          expect(result).toMatchObject(mockBundle);
        });

        it("should not remember the fallback if /code/preview also fails", async () => {
          const notFound = mockResponse(404, {
            error: { message: "Not found" },
          });
          const mockFetch = vi
            .fn()
            .mockResolvedValueOnce(notFound)
            .mockResolvedValueOnce(notFound)
            .mockResolvedValueOnce(redirectResponse(302, revisionPath))
            .mockResolvedValueOnce(mockResponse(200, mockBundle));
          (api as any).fetch = mockFetch;

          await expect(
            api.fetchLoaderData(["test"], { preview: true }),
          ).rejects.toThrow("Not found");
          await api.fetchLoaderData(["test"], { preview: true });

          expect(mockFetch).toHaveBeenNthCalledWith(
            3,
            previewUrl("https://codegen.plasmic.app"),
            expect.any(Object),
          );
        });

        it("should not fall back when the redirect target 404s", async () => {
          const mockFetch = vi
            .fn()
            .mockResolvedValueOnce(redirectResponse(302, revisionPath))
            .mockResolvedValueOnce(
              mockResponse(404, { error: { message: "Not found" } }),
            );
          (api as any).fetch = mockFetch;

          await expect(
            api.fetchLoaderData(["test"], { preview: true }),
          ).rejects.toThrow("Not found");
          expect(mockFetch).toHaveBeenCalledTimes(2);
        });

        it("should send sorted minRev hints", async () => {
          const mockFetch = vi
            .fn()
            .mockResolvedValue(mockResponse(200, mockBundle));
          (api as any).fetch = mockFetch;

          await api.fetchLoaderData(["test"], {
            preview: true,
            minRevs: { test: 12, other: 3 },
          });

          expect(mockFetch).toHaveBeenCalledWith(
            previewUrl(
              "https://codegen.plasmic.app",
              "&minRev=other%3A3&minRev=test%3A12",
            ),
            expect.any(Object),
          );
        });

        it("should not send minRev or loaderVersion for published", async () => {
          const mockFetch = vi
            .fn()
            .mockResolvedValueOnce(redirectResponse(302, "/versioned"))
            .mockResolvedValueOnce(mockResponse(200, mockBundle));
          (api as any).fetch = mockFetch;

          await api.fetchLoaderData(["test"], { minRevs: { test: 12 } });

          expect(mockFetch).toHaveBeenNthCalledWith(
            1,
            "https://codegen.plasmic.app/api/v1/loader/code/published?platform=react&projectId=test",
            expect.any(Object),
          );
        });
      });

      describe("host selection", () => {
        const run = async (opts: ConstructorParameters<typeof Api>[0]) => {
          const a = new Api(opts);
          const mockFetch = vi
            .fn()
            .mockResolvedValue(mockResponse(200, mockBundle));
          (a as any).fetch = mockFetch;
          await a.fetchLoaderData(["test"], { preview: true });
          return mockFetch.mock.calls[0][0];
        };
        const projects = [{ id: "test", token: "token" }];

        it("should let an explicit apiHost override the CDN host", async () => {
          expect(
            await run({
              projects,
              apiHost: "https://api.example.com",
              cdnHost: "https://cdn.example.com",
            }),
          ).toBe(previewUrl("https://api.example.com"));
        });

        it("should let an explicit host override cdnHost", async () => {
          expect(
            await run({
              projects,
              host: "https://host.example.com",
              cdnHost: "https://cdn.example.com",
            }),
          ).toBe(previewUrl("https://host.example.com"));
        });

        it("should default to cdnHost", async () => {
          expect(
            await run({ projects, cdnHost: "https://cdn.example.com" }),
          ).toBe(previewUrl("https://cdn.example.com"));
        });

        it("should resolve a relative Location against apiHost", async () => {
          const a = new Api({ projects, apiHost: "https://api.example.com" });
          const mockFetch = vi
            .fn()
            .mockResolvedValueOnce(redirectResponse(302, revisionPath))
            .mockResolvedValueOnce(mockResponse(200, mockBundle));
          (a as any).fetch = mockFetch;

          await a.fetchLoaderData(["test"], { preview: true });

          expect(mockFetch).toHaveBeenNthCalledWith(
            2,
            `https://api.example.com${revisionPath}`,
            expect.any(Object),
          );
        });
      });

      describe("with manualRedirect: false", () => {
        it("should let fetch follow redirects", async () => {
          const a = new Api({
            projects: [{ id: "test", token: "token" }],
            manualRedirect: false,
          });
          const mockFetch = vi
            .fn()
            .mockResolvedValue(mockResponse(200, mockBundle));
          (a as any).fetch = mockFetch;

          await a.fetchLoaderData(["test"], { preview: true });

          expect(mockFetch).toHaveBeenCalledTimes(1);
          expect(mockFetch.mock.calls[0][1].redirect).toBeUndefined();
        });
      });
    });

    describe("in the browser", () => {
      let BrowserApi: typeof Api;

      beforeEach(async () => {
        vi.resetModules();
        vi.stubGlobal("window", { document: {} });
        BrowserApi = (await import("./api")).Api;
        vi.unstubAllGlobals();
      });

      it("should let fetch follow the preview redirect", async () => {
        const a = new BrowserApi({
          projects: [{ id: "test", token: "token" }],
        });
        const mockFetch = vi
          .fn()
          .mockResolvedValueOnce(
            mockResponse(200, { redirectUrl: "/versioned?cb=1" }),
          )
          .mockResolvedValueOnce(mockResponse(200, mockBundle));
        (a as any).fetch = mockFetch;

        const result = await a.fetchLoaderData(["test"], {
          preview: true,
          browserOnly: true,
        });

        expect(mockFetch).toHaveBeenNthCalledWith(
          1,
          "https://codegen.plasmic.app/api/v1/loader/code/revision/latest?platform=react&projectId=test&browserOnly=true&loaderVersion=10",
          expect.not.objectContaining({ redirect: "manual" }),
        );
        expect(mockFetch).toHaveBeenNthCalledWith(
          2,
          "https://codegen.plasmic.app/versioned?cb=1",
          expect.any(Object),
        );
        expect(result).toMatchObject(mockBundle);
      });

      it("should fall back to /code/preview on a 404 from the route", async () => {
        const a = new BrowserApi({
          projects: [{ id: "test", token: "token" }],
        });
        const mockFetch = vi
          .fn()
          .mockResolvedValueOnce({
            ...mockResponse(404, { error: { message: "Not found" } }),
            redirected: false,
          })
          .mockResolvedValueOnce(mockResponse(200, mockBundle));
        (a as any).fetch = mockFetch;

        await a.fetchLoaderData(["test"], { preview: true });

        expect(mockFetch).toHaveBeenNthCalledWith(
          2,
          "https://codegen.plasmic.app/api/v1/loader/code/preview?platform=react&projectId=test&loaderVersion=10",
          expect.any(Object),
        );
      });

      it("retries the revision route after a browser network error", async () => {
        const browserApi = new BrowserApi({
          projects: [{ id: "test", token: "token" }],
        });
        const fetch = vi
          .fn()
          .mockRejectedValueOnce(new TypeError("Failed to fetch"))
          .mockResolvedValue(mockResponse(200, mockBundle));
        (browserApi as any).fetch = fetch;

        await browserApi.fetchLoaderData(["test"], { preview: true });
        await browserApi.fetchLoaderData(["test"], { preview: true });

        expect(fetch.mock.calls.map(([url]) => new URL(url).pathname)).toEqual([
          "/api/v1/loader/code/revision/latest",
          "/api/v1/loader/code/preview",
          "/api/v1/loader/code/revision/latest",
        ]);
      });

      it("should not fall back on a 404 after a followed redirect", async () => {
        const a = new BrowserApi({
          projects: [{ id: "test", token: "token" }],
        });
        const mockFetch = vi.fn().mockResolvedValueOnce({
          ...mockResponse(404, { error: { message: "Not found" } }),
          redirected: true,
        });
        (a as any).fetch = mockFetch;

        await expect(
          a.fetchLoaderData(["test"], { preview: true }),
        ).rejects.toThrow("Not found");
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it("should let fetch follow the published redirect", async () => {
        const a = new BrowserApi({
          projects: [{ id: "test", token: "token" }],
        });
        const mockFetch = vi
          .fn()
          .mockResolvedValue(mockResponse(200, mockBundle));
        (a as any).fetch = mockFetch;

        await a.fetchLoaderData(["test"], {});

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch.mock.calls[0][1].redirect).toBeUndefined();
      });
    });
  });

  describe("project tokens header", () => {
    const tokensHeader = async (projects: { id: string; token: string }[]) => {
      const api = new Api({ projects, manualRedirect: false });
      const mockFetch = vi.fn().mockResolvedValue({
        status: 200,
        text: async () => JSON.stringify({ projects: [] }),
        headers: { get: (_key: string) => null },
      });
      (api as any).fetch = mockFetch;
      await api.fetchLoaderData(["b", "a"], {});
      return mockFetch.mock.calls[0][1].headers["x-plasmic-api-project-tokens"];
    };

    it("serializes projects sorted by ID, regardless of input order", async () => {
      const ab = [
        { id: "a", token: "ta" },
        { id: "b", token: "tb" },
      ];
      expect(await tokensHeader(ab)).toBe("a:ta,b:tb");
      expect(await tokensHeader([...ab].reverse())).toBe("a:ta,b:tb");
    });

    it("keeps the relative order of duplicate IDs and doesn't mutate the input", async () => {
      const projects = [
        { id: "b", token: "tb" },
        { id: "a", token: "first" },
        { id: "a", token: "second" },
      ];
      expect(await tokensHeader(projects)).toBe("a:first,a:second,b:tb");
      expect(projects.map((p) => p.id)).toEqual(["b", "a", "a"]);
    });
  });
});
