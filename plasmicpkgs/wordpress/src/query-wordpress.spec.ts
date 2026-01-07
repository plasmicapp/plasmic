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
    await queryWordpress({
      wordpressUrl: "https://example.com",
      queryType: "posts",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://example.com/wp-json/wp/v2/posts")
    );
  });

  it("should construct correct URL for pages without filters", async () => {
    await queryWordpress({
      wordpressUrl: "https://example.com",
      queryType: "pages",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://example.com/wp-json/wp/v2/pages")
    );
  });

  it("should add search query parameter when provided", async () => {
    await queryWordpress({
      wordpressUrl: "https://example.com",
      queryType: "posts",
      queryOperator: "search",
      filterValue: "test",
    });

    const expectedUrl = new URL("https://example.com/wp-json/wp/v2/posts");
    expectedUrl.searchParams.append("search", "test");

    expect(fetchMock).toHaveBeenCalledWith(expectedUrl);
  });

  it("should add limit parameter when provided", async () => {
    await queryWordpress({
      wordpressUrl: "https://example.com",
      queryType: "posts",
      limit: 2,
    });

    const expectedUrl = new URL("https://example.com/wp-json/wp/v2/posts");
    expectedUrl.searchParams.append("per_page", "2");

    expect(fetchMock).toHaveBeenCalledWith(expectedUrl);
  });

  it("should combine query operator, filter value, and limit", async () => {
    await queryWordpress({
      wordpressUrl: "https://example.com",
      queryType: "posts",
      queryOperator: "slug",
      filterValue: "test-slug",
      limit: 10,
    });

    const expectedUrl = new URL("https://example.com/wp-json/wp/v2/posts");
    expectedUrl.searchParams.append("slug", "test-slug");
    expectedUrl.searchParams.append("per_page", "10");

    expect(fetchMock).toHaveBeenCalledWith(expectedUrl);
  });

  it("should return parsed JSON response", async () => {
    const result = await queryWordpress({
      wordpressUrl: "https://example.com",
      queryType: "posts",
    });

    expect(result).toEqual(mockResponseData);
  });

  it("should not add query parameters when operator is provided but value is missing", async () => {
    await queryWordpress({
      wordpressUrl: "https://example.com",
      queryType: "posts",
      queryOperator: "search",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://example.com/wp-json/wp/v2/posts")
    );
  });
});
