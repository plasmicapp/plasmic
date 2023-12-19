import { matchesPagePath } from "../utils";

describe("matchesPagePath", () => {
  it("works without slugs", () => {
    expect(matchesPagePath("/hello", "/hello")).toEqual({ params: {} });
    expect(matchesPagePath("/hello/", "/hello")).toEqual({ params: {} });
    expect(matchesPagePath("/hello", "/hello/")).toEqual({ params: {} });
    expect(matchesPagePath("/hello/", "/hello/")).toEqual({ params: {} });
    expect(matchesPagePath("/", "/")).toEqual({ params: {} });
    expect(matchesPagePath("/hello", "/what")).toEqual(false);
    expect(matchesPagePath("/", "/what")).toEqual(false);
  });

  it("works with normal slugs", () => {
    expect(matchesPagePath("/[slug]", "/what")).toEqual({
      params: { slug: "what" },
    });
    expect(
      matchesPagePath(
        "/something/[wicked]/is/[here]",
        "/something/what/is/where"
      )
    ).toEqual({ params: { wicked: "what", here: "where" } });
    expect(matchesPagePath("/blogs/[slug]", "/blogs/some-slug")).toEqual({
      params: { slug: "some-slug" },
    });
    expect(matchesPagePath("blogs/[slug]", "blogs/some-slug")).toEqual({
      params: { slug: "some-slug" },
    });
    expect(matchesPagePath("/blogs/[slug]", "blogs/some-slug")).toEqual({
      params: { slug: "some-slug" },
    });
    expect(matchesPagePath("blogs/[slug]", "/blogs/some-slug")).toEqual({
      params: { slug: "some-slug" },
    });
    expect(
      matchesPagePath("/something/[wicked]/is/[here]", "/something/what/is")
    ).toEqual(false);
    expect(matchesPagePath("/something/[wicked]", "/something")).toEqual(false);
    expect(matchesPagePath("/something/[wicked]", "/something/yes/no")).toEqual(
      false
    );
  });

  it("works with catchall slugs", () => {
    expect(matchesPagePath("/[...catchall]", "/what")).toEqual({
      params: { catchall: ["what"] },
    });
    expect(matchesPagePath("/[...catchall]", "/what/is/this")).toEqual({
      params: { catchall: ["what", "is", "this"] },
    });
    expect(
      matchesPagePath(
        "/prefix/[yes]/and/[...catchall]",
        "/prefix/no/and/what/is/this"
      )
    ).toEqual({ params: { yes: "no", catchall: ["what", "is", "this"] } });
    expect(matchesPagePath("/why/[...catchall]", "/")).toEqual(false);
    expect(matchesPagePath("/why/[...catchall]", "/why")).toEqual(false);
  });

  it("works with optional catchall slugs", () => {
    expect(matchesPagePath("/[[...catchall]]", "/what")).toEqual({
      params: { catchall: ["what"] },
    });
    expect(matchesPagePath("/[[...catchall]]", "/what/is/this")).toEqual({
      params: { catchall: ["what", "is", "this"] },
    });
    expect(matchesPagePath("/[[...catchall]]", "what/is/this")).toEqual({
      params: { catchall: ["what", "is", "this"] },
    });
    expect(matchesPagePath("[[...catchall]]", "what/is/this")).toEqual({
      params: { catchall: ["what", "is", "this"] },
    });
    expect(matchesPagePath("[[...catchall]]", "/what/is/this")).toEqual({
      params: { catchall: ["what", "is", "this"] },
    });
    expect(
      matchesPagePath(
        "/prefix/[yes]/and/[[...catchall]]",
        "/prefix/no/and/what/is/this"
      )
    ).toEqual({ params: { yes: "no", catchall: ["what", "is", "this"] } });
    expect(matchesPagePath("/why/[[...catchall]]", "/why")).toEqual({
      params: { catchall: [] },
    });
    expect(matchesPagePath("/why/[[...catchall]]", "/")).toEqual(false);
  });
});
