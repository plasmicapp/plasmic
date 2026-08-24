import { ExprCtx } from "@/wab/shared/core/exprs";
import { DEVFLAGS } from "@/wab/shared/devflags";
import {
  Component,
  CustomCode,
  ObjectPath,
  PageHref,
  PageMeta,
  TemplatedString,
} from "@/wab/shared/model/classes";
import {
  evalPageHrefPath,
  extractParamsFromPagePath,
  extractPathParamMetas,
  extractQueryParamMetas,
  getMatchingPagePathParams,
  substituteUrlParams,
} from "@/wab/shared/utils/url-utils";

describe("extractParamsFromPagePath", () => {
  it("extracts segment, catchall, and optional catchall params", () => {
    expect(extractParamsFromPagePath("/")).toEqual([]);
    expect(extractParamsFromPagePath("/hello/world")).toEqual([]);
    expect(extractParamsFromPagePath("/hello/[yes]/and/[...what]")).toEqual([
      "yes",
      "...what",
    ]);
    expect(extractParamsFromPagePath("/hello/[[...what]]")).toEqual([
      "...what",
    ]);
    expect(extractParamsFromPagePath("/pre[a]post/[b]-[c]")).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("extractPathParamMetas", () => {
  it("extracts path params with required flag and preview value", () => {
    const pageMeta = {
      path: "/blog/[slug]/[...rest]/[[...opt]]",
      params: { slug: "hello", "...opt": "a/b" },
      query: {},
    } as unknown as PageMeta;
    expect(extractPathParamMetas(pageMeta)).toEqual([
      {
        key: "slug",
        type: "Path",
        required: true,
        catchall: false,
        previewValue: "hello",
      },
      {
        key: "...rest",
        type: "Path",
        required: true,
        catchall: true,
        previewValue: undefined,
      },
      {
        key: "...opt",
        type: "Path",
        required: false,
        catchall: true,
        previewValue: "a/b",
      },
    ]);
  });
});

describe("extractQueryParamMetas", () => {
  it("extracts query params with preview values", () => {
    const pageMeta = {
      path: "/blog",
      params: {},
      query: { page: "1", sort: "asc" },
    } as unknown as PageMeta;
    expect(extractQueryParamMetas(pageMeta)).toEqual([
      { type: "Query", key: "page", previewValue: "1" },
      { type: "Query", key: "sort", previewValue: "asc" },
    ]);
  });
});

describe("substituteUrlParams/getMatchingPagePathParams", () => {
  it("round-trips", () => {
    const template = "/[x]/-/[...y]";
    const params = { x: "hello/you", "...y": "a&b/c&d" };

    const path = substituteUrlParams(template, params);
    expect(path).toEqual("/hello%2Fyou/-/a%26b/c%26d");

    expect(getMatchingPagePathParams(template, path)).toEqual(params);
  });
});

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
      substituteUrlParams("/blog/[...slug]", { "...slug": "a&b" })
    ).toEqual("/blog/a%26b");
    expect(
      substituteUrlParams("/blog/[...slug]", { "...slug": "a&b/c&d" })
    ).toEqual("/blog/a%26b/c%26d");
    expect(
      substituteUrlParams("/blog/[[...slug]]", { "...slug": "a&b/c&d" })
    ).toEqual("/blog/a%26b/c%26d");
  });
  it("handles missing params", () => {
    expect(substituteUrlParams("/[slug]", {})).toEqual("/[slug]");
    expect(substituteUrlParams("/[...slug]", {})).toEqual("/[...slug]");
    expect(substituteUrlParams("/[[...slug]]", {})).toEqual("/");

    expect(substituteUrlParams("/blog/[slug]", {})).toEqual("/blog/[slug]");
    expect(substituteUrlParams("/blog/[...slug]", {})).toEqual(
      "/blog/[...slug]"
    );
    expect(substituteUrlParams("/blog/[[...slug]]", {})).toEqual("/blog/");
  });
});

describe("getMatchingPagePathParams", () => {
  let pagePath: string;
  const run = (lookup: string) => getMatchingPagePathParams(pagePath, lookup);

  test("static paths", () => {
    pagePath = "";
    expect(run("")).toEqual({});
    expect(run("/")).toEqual({});
    expect(run("/a")).toEqual(false);

    pagePath = "/";
    expect(run("")).toEqual({});
    expect(run("/")).toEqual({});
    expect(run("/a")).toEqual(false);

    pagePath = "/a";
    expect(run("/")).toEqual(false);
    expect(run("/a")).toEqual({});
    expect(run("/a/")).toEqual({});
    expect(run("/a/b")).toEqual(false);
    expect(run("/b")).toEqual(false);

    pagePath = "/a b";
    expect(run("/a b")).toEqual({});
    expect(run("/a%20b")).toEqual({});

    pagePath = "/a%20b";
    expect(run("/a b")).toEqual({});
    expect(run("/a%20b")).toEqual({});
    expect(run("/a%2520b")).toEqual(false);

    pagePath = "/100%";
    expect(run("/100")).toEqual(false);
    expect(run("/100%")).toEqual({});
    expect(run("/100%25")).toEqual({});
  });

  test("segment params", () => {
    pagePath = "/[x]";
    expect(run("/")).toEqual(false);
    expect(run("/a")).toEqual({ x: "a" });
    expect(run("/a/")).toEqual({ x: "a" });
    expect(run("/a/b")).toEqual(false);

    pagePath = "/[x]/[y]";
    expect(run("/")).toEqual(false);
    expect(run("/a")).toEqual(false);
    expect(run("/a/b")).toEqual({ x: "a", y: "b" });
    expect(run("/a/b/")).toEqual({ x: "a", y: "b" });
    expect(run("/a/b/c")).toEqual(false);

    pagePath = "/a/[x]";
    expect(run("/")).toEqual(false);
    expect(run("/a")).toEqual(false);
    expect(run("/a/b")).toEqual({ x: "b" });
    expect(run("/a/b/")).toEqual({ x: "b" });
    expect(run("/a/b/c")).toEqual(false);

    pagePath = "/[x]/b";
    expect(run("/")).toEqual(false);
    expect(run("/a")).toEqual(false);
    expect(run("/a/b")).toEqual({ x: "a" });
    expect(run("/a/b/")).toEqual({ x: "a" });
    expect(run("/a/b/c")).toEqual(false);

    pagePath = "/[x]/b/[y]";
    expect(run("/")).toEqual(false);
    expect(run("/a")).toEqual(false);
    expect(run("/a/b")).toEqual(false);
    expect(run("/a/b/c")).toEqual({ x: "a", y: "c" });
    expect(run("/a/b/c/")).toEqual({ x: "a", y: "c" });

    pagePath = "/[x]-[y]";
    expect(run("/-")).toEqual(false);
    expect(run("/-b")).toEqual(false);
    expect(run("/a-")).toEqual(false);
    expect(run("/a-b")).toEqual({ x: "a", y: "b" });
  });

  test("catchall params", () => {
    pagePath = "/[...x]";
    expect(run("/")).toEqual({ "...x": "" }); // bug?
    expect(run("/a")).toEqual({ "...x": "a" });
    expect(run("/a/")).toEqual({ "...x": "a" });
    expect(run("/a/b")).toEqual({ "...x": "a/b" });
    expect(run("/a/b/")).toEqual({ "...x": "a/b" });

    pagePath = "/a/[...x]";
    expect(run("/")).toEqual(false);
    expect(run("/a")).toEqual(false);
    expect(run("/a/")).toEqual(false);
    expect(run("/a/b")).toEqual({ "...x": "b" });
    expect(run("/a/b/")).toEqual({ "...x": "b" });
    expect(run("/a/b/c")).toEqual({ "...x": "b/c" });
    expect(run("/a/b/c/")).toEqual({ "...x": "b/c" });
  });

  test("optional catchall params", () => {
    pagePath = "/[[...x]]";
    expect(run("/")).toEqual({ "...x": "" });
    expect(run("/a")).toEqual({ "...x": "a" });
    expect(run("/a/")).toEqual({ "...x": "a" });
    expect(run("/a/b")).toEqual({ "...x": "a/b" });
    expect(run("/a/b/")).toEqual({ "...x": "a/b" });

    pagePath = "/a/[[...x]]";
    expect(run("/")).toEqual(false);
    expect(run("/a")).toEqual({ "...x": "" });
    expect(run("/a/")).toEqual({ "...x": "" });
    expect(run("/a/b")).toEqual({ "...x": "b" });
    expect(run("/a/b/")).toEqual({ "...x": "b" });
    expect(run("/a/b/c")).toEqual({ "...x": "b/c" });
    expect(run("/a/b/c/")).toEqual({ "...x": "b/c" });
  });

  test("decodes", () => {
    pagePath = "/[x]";
    expect(run("/hello,%20world")).toEqual({ x: "hello, world" });
    expect(run("/ben%20%26%20jerry's")).toEqual({
      x: "ben & jerry's",
    });
    expect(run("/a%2Fb")).toEqual({ x: "a/b" });

    pagePath = "/[...x]";
    expect(run("/a%2Fb/c%2Fd")).toEqual({ "...x": "a/b/c/d" });
  });
});

function templated(val: string | string[]): TemplatedString | ObjectPath {
  if (typeof val === "string") {
    return new TemplatedString({ text: [val] });
  }
  return new ObjectPath({
    path: val,
    fallback: null,
  });
}

describe("evalPageHrefPath", () => {
  const exprCtx: ExprCtx = {
    projectFlags: DEVFLAGS,
    component: null,
    inStudio: true,
  };

  function evalPageHref(
    props: Partial<Omit<PageHref, "encode">> & { path: string },
    canvasEnv: Record<string, any> = {}
  ): { encode: string; noEncode: string } {
    const { query, params, fragment, path } = props;
    const evalWithEncode = (encode: boolean): string => {
      const expr: PageHref = {
        typeTag: "PageHref",
        uid: 1,
        query: query ?? {},
        params: params ?? {},
        fragment,
        encode,
        page: {
          pageMeta: { path, params: {} },
        } as Component,
      };
      const result = evalPageHrefPath({ expr, exprCtx, canvasEnv });
      if (result.err) {
        throw result.err;
      }
      return result.val;
    };
    return {
      encode: evalWithEncode(true),
      noEncode: evalWithEncode(false),
    };
  }

  it("evaluates path", () => {
    expect(evalPageHref({ path: "/mypage" })).toEqual({
      encode: "/mypage",
      noEncode: "/mypage",
    });
  });

  it("evaluates path param", () => {
    expect(
      evalPageHref({
        path: "/blog/[slug]",
        params: { slug: templated("hello/you & me") },
      })
    ).toEqual({
      encode: "/blog/hello%2Fyou%20%26%20me",
      noEncode: "/blog/hello/you & me",
    });
  });

  it("evaluates catchall path param", () => {
    expect(
      evalPageHref({
        path: "/blog/[...slug]",
        params: { "...slug": templated("cats & dogs/50% off") },
      })
    ).toEqual({
      encode: "/blog/cats%20%26%20dogs/50%25%20off",
      noEncode: "/blog/cats & dogs/50% off",
    });

    expect(
      evalPageHref({
        path: "/blog/[...slug]",
        params: { "...slug": templated("/a//b/") },
      })
    ).toEqual({
      encode: "/blog//a//b/",
      noEncode: "/blog//a//b/",
    });

    expect(
      evalPageHref({
        path: "/blog/[[...slug]]",
        params: { "...slug": templated("cats & dogs/50% off") },
      })
    ).toEqual({
      encode: "/blog/cats%20%26%20dogs/50%25%20off",
      noEncode: "/blog/cats & dogs/50% off",
    });
  });

  it("evaluates query params", () => {
    expect(
      evalPageHref({
        path: "/mypage",
        query: {
          q1: templated("Cats & Dogs"),
          q2: templated("a/b?c=d"),
          "key with spaces": templated("50% off"),
        },
      })
    ).toEqual({
      encode:
        "/mypage?q1=Cats%20%26%20Dogs&q2=a%2Fb%3Fc%3Dd&key%20with%20spaces=50%25%20off",
      noEncode: "/mypage?q1=Cats & Dogs&q2=a/b?c=d&key%20with%20spaces=50% off",
    });
  });

  it("encodes already-encoded values again", () => {
    expect(
      evalPageHref({
        path: "/blog/[slug]",
        params: { slug: templated("Cats%20%26%20Dogs") },
        query: { q1: templated("Cats%20%26%20Dogs") },
      })
    ).toEqual({
      encode: "/blog/Cats%2520%2526%2520Dogs?q1=Cats%2520%2526%2520Dogs",
      noEncode: "/blog/Cats%20%26%20Dogs?q1=Cats%20%26%20Dogs",
    });
  });

  it("keeps a sequence expression as one encoded argument", () => {
    // Stored code is parenthesized and getCodeExpressionWithFallback keeps
    // it that way, so `($state.a, $state.b)` stays one argument to
    // encodeURIComponent rather than two.
    const seq = new CustomCode({
      code: "($state.first, $state.second)",
      fallback: null,
    });
    expect(
      evalPageHref(
        {
          path: "/search/[q]",
          params: { q: seq },
          query: { q: seq },
        },
        { $state: { first: "first value", second: "second value" } }
      )
    ).toEqual({
      encode: "/search/second%20value?q=second%20value",
      noEncode: "/search/second value?q=second value",
    });
  });

  it("keeps a sequence expression as one catchall argument", () => {
    const seq = new CustomCode({
      code: "($state.first, $state.rest)",
      fallback: null,
    });
    expect(
      evalPageHref(
        { path: "/blog/[...slug]", params: { "...slug": seq } },
        { $state: { first: "nope", rest: ["a/b", "c"] } }
      )
    ).toEqual({
      encode: "/blog/a%2Fb/c",
      noEncode: "/blog/a/b,c",
    });
  });

  it("never encodes fragment", () => {
    expect(
      evalPageHref({
        path: "/mypage",
        fragment: templated("a&b/c"),
      })
    ).toEqual({
      encode: "/mypage#a&b/c",
      noEncode: "/mypage#a&b/c",
    });
  });

  it("evaluates path params, query params, and fragment together", () => {
    expect(
      evalPageHref({
        path: "/mypage/[p1]",
        params: { p1: templated("a b") },
        query: { q1: templated("1&2") },
        fragment: templated("frag ment"),
      })
    ).toEqual({
      encode: "/mypage/a%20b?q1=1%262#frag ment",
      noEncode: "/mypage/a b?q1=1&2#frag ment",
    });
  });

  it("rejects missing or empty required path params", () => {
    expect(() => evalPageHref({ path: "/blog/[slug]" })).toThrow(
      'Required path param "slug" is empty'
    );
    expect(() =>
      evalPageHref({
        path: "/blog/[slug]",
        params: { slug: templated("") },
      })
    ).toThrow('Required path param "slug" is empty');
    expect(() =>
      evalPageHref({
        path: "/blog/[...slug]",
        params: { "...slug": templated("") },
      })
    ).toThrow('Required path param "...slug" is empty');

    // Optional catchall params can be missing or empty
    expect(evalPageHref({ path: "/blog/[[...slug]]" })).toEqual({
      encode: "/blog/[[...slug]]",
      noEncode: "/blog/[[...slug]]",
    });
    expect(
      evalPageHref({
        path: "/blog/[[...slug]]",
        params: { "...slug": templated("") },
      })
    ).toEqual({
      encode: "/blog/",
      noEncode: "/blog/",
    });

    // Empty query params and fragment are fine
    expect(
      evalPageHref({
        path: "/blog",
        query: { q: templated("") },
        fragment: templated(""),
      })
    ).toEqual({
      encode: "/blog?q=#",
      noEncode: "/blog?q=#",
    });
  });

  it("fails to evaluate with missing state", () => {
    expect(() =>
      evalPageHref({
        path: "/mypage/[p1]",
        params: { p1: templated(["$state", "test"]) },
        query: { q1: templated(["$state", "test"]) },
        fragment: templated(["$state", "test"]),
      })
    ).toThrow("$state is not defined");
  });

  it("evaluates dynamic values", () => {
    expect(
      evalPageHref(
        {
          path: "/mypage/[p1]",
          params: { p1: templated(["$state", "test"]) },
          query: { q1: templated(["$state", "test"]) },
          fragment: templated(["$state", "test"]),
        },
        { $state: { test: "my val" } }
      )
    ).toEqual({
      encode: "/mypage/my%20val?q1=my%20val#my val",
      noEncode: "/mypage/my val?q1=my val#my val",
    });
  });

  it("evaluates dynamic array catchall path param", () => {
    // Unlike a string value, a `/` inside an array item stays escaped.
    expect(
      evalPageHref(
        {
          path: "/blog/[...slug]",
          params: { "...slug": templated(["$state", "test"]) },
        },
        { $state: { test: ["cats & dogs", "50% off", "a/b"] } }
      )
    ).toEqual({
      encode: "/blog/cats%20%26%20dogs/50%25%20off/a%2Fb",
      noEncode: "/blog/cats & dogs,50% off,a/b",
    });
  });

  it("evaluates catchall path param mixing static text and dynamic values", () => {
    expect(
      evalPageHref(
        {
          path: "/blog/[...slug]",
          params: {
            "...slug": new TemplatedString({
              text: [
                "docs & more/",
                new ObjectPath({ path: ["$state", "test"], fallback: null }),
              ],
            }),
          },
        },
        { $state: { test: "intro/a b" } }
      )
    ).toEqual({
      encode: "/blog/docs%20%26%20more/intro/a%20b",
      noEncode: "/blog/docs & more/intro/a b",
    });

    // Concatenating with surrounding text coerces the array to a string.
    expect(
      evalPageHref(
        {
          path: "/blog/[...slug]",
          params: {
            "...slug": new TemplatedString({
              text: [
                "x-",
                new ObjectPath({ path: ["$state", "test"], fallback: null }),
              ],
            }),
          },
        },
        { $state: { test: ["a", "b"] } }
      )
    ).toEqual({
      encode: "/blog/x-a%2Cb",
      noEncode: "/blog/x-a,b",
    });
  });

  it("keeps a dynamic array within one path segment or query value", () => {
    // The array coerces to a `,`-joined string before encoding.
    expect(
      evalPageHref(
        {
          path: "/blog/[slug]",
          params: { slug: templated(["$state", "test"]) },
          query: { q1: templated(["$state", "test"]) },
        },
        { $state: { test: ["a,b", "c d"] } }
      )
    ).toEqual({
      encode: "/blog/a%2Cb%2Cc%20d?q1=a%2Cb%2Cc%20d",
      noEncode: "/blog/a,b,c d?q1=a,b,c d",
    });
  });

  it("evaluates empty and non-string dynamic values", () => {
    const props = {
      path: "/blog/[[...slug]]",
      params: { "...slug": templated(["$state", "test"]) },
      query: { q1: templated(["$state", "test"]) },
    };

    expect(evalPageHref(props, { $state: { test: "" } })).toEqual({
      encode: "/blog/?q1=",
      noEncode: "/blog/?q1=",
    });

    expect(evalPageHref(props, { $state: { test: 123 } })).toEqual({
      encode: "/blog/123?q1=123",
      noEncode: "/blog/123?q1=123",
    });

    expect(evalPageHref(props, { $state: { test: undefined } })).toEqual({
      encode: "/blog/undefined?q1=undefined",
      noEncode: "/blog/undefined?q1=undefined",
    });
  });
});
