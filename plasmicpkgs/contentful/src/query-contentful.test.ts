import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryContentful } from "./query-contentful";

describe("queryContentful", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockResolvedValue({
      json: async () => ({ items: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  function requestedParams() {
    expect(fetchMock).toHaveBeenCalledTimes(1);
    return new URL(fetchMock.mock.calls[0][0]).searchParams;
  }

  it("passes all query options to the Contentful API", async () => {
    await queryContentful({
      space: "space",
      accessToken: "token",
      contentType: "blogPost",
      order: "fields.title",
      reverseOrder: true,
      limit: 5,
      skip: 10,
      include: 2,
      select: ["fields.title", "sys"],
      locale: "de-DE",
    });

    const params = requestedParams();
    expect(Object.fromEntries(params)).toEqual({
      access_token: "token",
      content_type: "blogPost",
      order: "-fields.title",
      limit: "5",
      skip: "10",
      include: "2",
      select: "fields.title,sys",
      locale: "de-DE",
    });
  });

  it("does not add optional params when they are not set", async () => {
    await queryContentful({
      space: "space",
      accessToken: "token",
      contentType: "blogPost",
    });

    const params = requestedParams();
    expect(Object.fromEntries(params)).toEqual({
      access_token: "token",
      content_type: "blogPost",
    });
  });

  it.each([
    ["sys.createdAt", "sys.createdAt"],
    ["fields.title", "fields.title"],
    ["title", "fields.title"],
  ])("orders by %s as %s", async (order, expected) => {
    await queryContentful({
      space: "space",
      accessToken: "token",
      contentType: "blogPost",
      order,
    });

    expect(requestedParams().get("order")).toBe(expected);
  });
});
