import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  MockedFunction,
  vi,
} from "vitest";
import { queryWordpress } from "./query-wordpress";

describe("queryWordpress", () => {
  let mockResponseData: unknown;
  let fetchMock: MockedFunction<() => Promise<unknown>>;

  beforeEach(() => {
    mockResponseData = [{ id: 1, title: "Post 1", slug: "test-slug" }];
    fetchMock = vi.fn(() =>
      Promise.resolve({ json: async () => mockResponseData })
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should construct URL for posts without filters", async () => {
    await queryWordpress("https://example.com", "posts");

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://example.com/wp-json/wp/v2/posts")
    );
  });

  it("should construct correct URL for pages without filters", async () => {
    await queryWordpress("https://example.com", "pages");

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://example.com/wp-json/wp/v2/pages")
    );
  });

  it("should add search query parameter when provided", async () => {
    await queryWordpress("https://example.com", "posts", "search", "test");

    const expectedUrl = new URL("https://example.com/wp-json/wp/v2/posts");
    expectedUrl.searchParams.append("search", "test");

    expect(fetchMock).toHaveBeenCalledWith(expectedUrl);
  });

  it("should add limit parameter when provided", async () => {
    await queryWordpress(
      "https://example.com",
      "posts",
      undefined,
      undefined,
      2
    );

    const expectedUrl = new URL("https://example.com/wp-json/wp/v2/posts");
    expectedUrl.searchParams.append("per_page", "2");

    expect(fetchMock).toHaveBeenCalledWith(expectedUrl);
  });

  it("should combine query operator, filter value, and limit", async () => {
    await queryWordpress(
      "https://example.com",
      "posts",
      "slug",
      "test-slug",
      10
    );

    const expectedUrl = new URL("https://example.com/wp-json/wp/v2/posts");
    expectedUrl.searchParams.append("slug", "test-slug");
    expectedUrl.searchParams.append("per_page", "10");

    expect(fetchMock).toHaveBeenCalledWith(expectedUrl);
  });

  it("should return parsed JSON response", async () => {
    const result = await queryWordpress("https://example.com", "posts");

    expect(result).toEqual(mockResponseData);
  });

  it("should not add query parameters when operator is provided but value is missing", async () => {
    await queryWordpress("https://example.com", "posts", "search", undefined);

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://example.com/wp-json/wp/v2/posts")
    );
  });
});
