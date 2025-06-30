import { ExprCtx } from "@/wab/shared/core/exprs";
import { DEVFLAGS } from "@/wab/shared/devflags";
import {
  Component,
  ObjectPath,
  PageHref,
  TemplatedString,
} from "@/wab/shared/model/classes";
import {
  evalPageHrefPath,
  substituteUrlParams,
} from "@/wab/shared/utils/url-utils";

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

function templated(val: string | string[]): TemplatedString | ObjectPath {
  if (typeof val === "string") {
    return new TemplatedString({ text: [val] });
  }
  return new ObjectPath({
    path: val,
    fallback: null,
  });
}

describe("pageHrefPathToCode", () => {
  let exprCtx: ExprCtx;
  let canvasEnv: Record<string, any>;

  const makePageHref = (
    props: Partial<PageHref> & { path: string }
  ): PageHref => {
    const { query, params, fragment, path } = props;
    return {
      typeTag: "PageHref",
      uid: 1,
      query: query ?? {},
      params: params ?? {},
      fragment,
      page: {
        pageMeta: { path },
      } as Component,
    };
  };

  beforeEach(() => {
    exprCtx = {
      projectFlags: DEVFLAGS,
      component: null,
      inStudio: true,
    };
    canvasEnv = {};
  });

  it("converts PageHref to path code and evaluates", () => {
    // Plain PageHref
    let expr = makePageHref({ path: "/mypage" });
    let result = evalPageHrefPath({ expr, exprCtx, canvasEnv });
    expect(result).toEqual({ val: "/mypage", err: undefined });

    // PageHref with single param
    expr = makePageHref({
      path: "/mypage/[p1]",
      params: { p1: templated("test") },
    });
    result = evalPageHrefPath({ expr, exprCtx, canvasEnv });
    expect(result).toEqual({ val: "/mypage/test", err: undefined });

    // PageHref with param and query
    expr = makePageHref({
      path: "/mypage/[p1]",
      query: { q1: templated("123") },
    });
    result = evalPageHrefPath({ expr, exprCtx, canvasEnv });
    expect(result).toEqual({ val: "/mypage/[p1]?q1=123", err: undefined });

    // PageHref with param, query, and fragment
    expr = makePageHref({
      path: "/mypage/[p1]",
      params: { p1: templated("test") },
      query: { q1: templated("123") },
      fragment: templated("frag"),
    });
    result = evalPageHrefPath({ expr, exprCtx, canvasEnv });
    expect(result).toEqual({ val: "/mypage/test?q1=123#frag", err: undefined });

    // PageHref with dynamic value
    expr = makePageHref({
      path: "/mypage/[p1]",
      params: { p1: templated(["$state", "test"]) },
      query: { q1: templated(["$state", "test"]) },
      fragment: templated(["$state", "test"]),
    });
    // Failure case (missing state in canvasEnv)
    result = evalPageHrefPath({ expr, exprCtx, canvasEnv });
    expect(result.val).toEqual(undefined);
    expect(result.err?.toString()).toEqual(
      "ReferenceError: $state is not defined"
    );
    // With expected canvasEnv state
    canvasEnv = { $state: { test: "myval" } };
    result = evalPageHrefPath({ expr, exprCtx, canvasEnv });
    expect(result).toEqual({
      val: "/mypage/myval?q1=myval#myval",
      err: undefined,
    });
  });
});
