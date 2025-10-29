import { Api, ProjectMeta, transformApiLoaderBundleOutput } from "../api";

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

    describe("fetch without useLastResponse", () => {
      beforeEach(() => {
        api = new Api({
          projects: [{ id: "test", token: "token" }],
          nativeFetch: false,
          manualRedirect: false,
        });
      });

      it("should handle normal 200 response", async () => {
        const mockFetch = jest
          .fn()
          .mockResolvedValue(mockResponse(200, mockBundle));
        (api as any).fetch = mockFetch;

        const result = await api.fetchLoaderData(["test"], {});

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(result).toMatchObject(mockBundle);
      });

      it("should handle 200 response with redirectUrl", async () => {
        const mockFetch = jest
          .fn()
          .mockResolvedValueOnce(
            mockResponse(200, { redirectUrl: "/versioned?cb=123" })
          )
          .mockResolvedValueOnce(mockResponse(200, mockBundle));
        (api as any).fetch = mockFetch;

        const result = await api.fetchLoaderData(["test"], {});

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(mockFetch).toHaveBeenNthCalledWith(
          2,
          "https://codegen.plasmic.app/versioned?cb=123",
          expect.any(Object)
        );
        expect(result).toMatchObject(mockBundle);
      });

      it("should throw error on initial fetch failure", async () => {
        (api as any).fetch = jest
          .fn()
          .mockResolvedValue(
            mockResponse(400, { error: { message: "Bad request" } })
          );

        await expect(api.fetchLoaderData(["test"], {})).rejects.toThrow(
          "Bad request"
        );
      });

      it("should throw error after redirectUrl fetch failure", async () => {
        const mockFetch = jest
          .fn()
          .mockResolvedValueOnce(
            mockResponse(200, { redirectUrl: "/versioned" })
          )
          .mockResolvedValueOnce(
            mockResponse(500, { error: { message: "Server error" } })
          );
        (api as any).fetch = mockFetch;

        await expect(api.fetchLoaderData(["test"], {})).rejects.toThrow(
          "Server error"
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
        const mockFetch = jest
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
        const mockFetch = jest
          .fn()
          .mockResolvedValue(mockResponse(200, mockBundle));
        (api as any).fetch = mockFetch;

        await expect(api.fetchLoaderData(["test"], {})).rejects.toThrow(
          "redirect was expected"
        );
      });

      it("should throw error if redirect has no location header", async () => {
        const mockFetch = jest.fn().mockResolvedValue({
          status: 301,
          headers: { get: () => null },
        });
        (api as any).fetch = mockFetch;

        await expect(api.fetchLoaderData(["test"], {})).rejects.toThrow(
          "no location header"
        );
      });

      it("should reuse cached response for same redirect location", async () => {
        const mockFetch = jest
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
        const mockFetch = jest
          .fn()
          .mockResolvedValueOnce({
            status: 302,
            headers: {
              get: (key: string) => (key === "location" ? "/versioned" : null),
            },
          })
          .mockResolvedValueOnce(
            mockResponse(404, { error: { message: "Not found" } })
          );
        (api as any).fetch = mockFetch;

        await expect(api.fetchLoaderData(["test"], {})).rejects.toThrow(
          "Not found"
        );
      });
    });
  });
});
