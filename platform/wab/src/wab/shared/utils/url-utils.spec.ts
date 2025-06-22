import { ExprCtx } from "@/wab/shared/core/exprs";
import { DEVFLAGS } from "@/wab/shared/devflags";
import {
  Component,
  ObjectPath,
  PageHref,
  TemplatedString,
} from "@/wab/shared/model/classes";
import {
  pageHrefPathToCode,
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
  });

  it("converts PageHref to path code", () => {
    // Plain PageHref
    let expr = makePageHref({ path: "/mypage" });
    expect(pageHrefPathToCode({ expr, exprCtx })).toEqual("(`/mypage`)");

    // PageHref with single param
    expr = makePageHref({
      path: "/mypage/[p1]",
      params: { p1: templated("test") },
    });
    expect(pageHrefPathToCode({ expr, exprCtx })).toEqual(
      '(`/mypage/${"test"}`)'
    );

    // PageHref with param and query
    expr = makePageHref({
      path: "/mypage/[p1]",
      query: { q1: templated("123") },
    });
    expect(pageHrefPathToCode({ expr, exprCtx })).toEqual(
      '(`/mypage/[p1]?q1=${"123"}`)'
    );

    // PageHref with param, query, and fragment
    expr = makePageHref({
      path: "/mypage/[p1]",
      params: { p1: templated("test") },
      query: { q1: templated("123") },
      fragment: templated("frag"),
    });
    expect(pageHrefPathToCode({ expr, exprCtx })).toEqual(
      '(`/mypage/${"test"}?q1=${"123"}#${"frag"}`)'
    );

    // PageHref with dynamic value
    const varCode = `\${(
      $state.test
    )}`;
    expr = makePageHref({
      path: "/mypage/[p1]",
      params: { p1: templated(["$state", "test"]) },
      query: { q1: templated(["$state", "test"]) },
      fragment: templated(["$state", "test"]),
    });
    expect(pageHrefPathToCode({ expr, exprCtx })).toEqual(
      `(\`/mypage/${varCode}?q1=${varCode}#${varCode}\`)`
    );
  });
});
