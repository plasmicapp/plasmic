import { substituteUrlParams } from "@/wab/shared/utils/url-utils";

describe("substituteUrlParams", () => {
  it("works", () => {
    expect(substituteUrlParams("/hello", {})).toEqual("/hello");
    expect(substituteUrlParams("/blog/[slug]", { slug: "hello" })).toEqual(
      "/blog/hello"
    );
    expect(substituteUrlParams("/blog/[slug]", { slug: "hello/you" })).toEqual(
      "/blog/hello%2Fyou"
    );
    expect(
      substituteUrlParams("/blog/[...slug]", { "...slug": "yes" })
    ).toEqual("/blog/yes");
    expect(
      substituteUrlParams("/blog/[...slug]", { "...slug": "yes/no/maybe" })
    ).toEqual("/blog/yes/no/maybe");
    expect(substituteUrlParams("/blog/[[...slug]]", {})).toEqual("/blog/");
    expect(
      substituteUrlParams("/blog/[[...slug]]", { "...slug": "yes/no/maybe" })
    ).toEqual("/blog/yes/no/maybe");

    expect(substituteUrlParams("/blog/[slug]", {})).toEqual("/blog/[slug]");
    expect(substituteUrlParams("/blog/[...slug]", {})).toEqual(
      "/blog/[...slug]"
    );
    expect(substituteUrlParams("/blog/[[...slug]]", {})).toEqual("/blog/");
  });
});
