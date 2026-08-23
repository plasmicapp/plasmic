import { isNonNil } from "@/wab/shared/common";
import {
  MatchFunction,
  ParamData,
  PathFunction,
  compile,
  match,
} from "path-to-regexp";
import { ParsedUrlQueryInput } from "querystring";
import type { Simplify } from "type-fest";
import url from "url";

export function route<
  Pattern extends string,
  ParamTypes extends ParamData = {}
>(pattern: Pattern): Route<PathParamsOf<Pattern, ParamTypes>> {
  return new Route(pattern);
}

export class Route<PathParams = {}> {
  // Matchers are compiled lazily, on first use.
  private compilePattern?: PathFunction<ParamData>;
  private matchPatternExact?: MatchFunction<ParamData>;
  private matchPatternPrefix?: MatchFunction<ParamData>;

  constructor(readonly pattern: string) {}

  fill(pathParams: PathParams, query?: string | ParsedUrlQueryInput): string {
    this.compilePattern ??= compile(this.pattern);
    return url.format({
      pathname: this.compilePattern(fixParamData(pathParams as ParamData)),
      query: typeof query === "object" ? query : undefined,
      search: typeof query === "string" ? query : undefined,
    });
  }

  parse(path: string, exact = true): PathParams | null {
    // Double slash handling is weird, just don't accept them.
    if (path.includes("//")) {
      return null;
    }

    const matchPattern = exact
      ? (this.matchPatternExact ??= match(this.pattern))
      : (this.matchPatternPrefix ??= match(this.pattern, { end: false }));

    let matched: ReturnType<typeof matchPattern>;
    try {
      matched = matchPattern(path);
      if (!matched) {
        return null;
      }
    } catch (e) {
      // Don't accept malformed URIs.
      if (e instanceof URIError) {
        return null;
      } else {
        throw e;
      }
    }

    return fixParamData(matched.params) as PathParams;
  }
}

function fixParamData(params: ParamData): ParamData {
  return Object.fromEntries(
    Object.entries(params)
      .map(([key, value]) => {
        // Omit empty strings and arrays for consistency.
        if (value === "") {
          return null;
        } else if (Array.isArray(value)) {
          const withoutEmptyStrings = value.filter((s) => s !== "");
          if (withoutEmptyStrings.length > 0) {
            return [key, withoutEmptyStrings];
          } else {
            return null;
          }
        } else {
          return [key, value];
        }
      })
      .filter(isNonNil)
  );
}

/**
 * Converts path-to-regexp patterns to their params.
 * Note this type does NOT work for all valid patterns.
 * For example, "/:foo-:bar" will not parse "foo" and "bar correctly.
 *
 * Examples:
 *   "/projects/:projectId" => { projectId: ProjectId }
 *   "/:foo/:bar" => { foo: string, bar: string }
 *   "/:foo/*bar" => { foo: string, bar: string[] }
 *   "/:foo{/:bar}" => { foo: string, bar: string | undefined }
 *   "/:foo{/*bar}" => { foo: string, bar: string[] | undefined }
 */
export type PathParamsOf<Pattern extends string, ParamTypes = {}> = Simplify<
  FindOptional<Pattern, ParamTypes>
>;

/**
 * Find segments with optional segments, mark them Partial,
 * and pass IsOptional true.
 */
type FindOptional<
  Pattern extends string,
  ParamTypes
> = Pattern extends `${infer Head}{${infer Optional}}${infer Tail}`
  ? FindOptional<Head, ParamTypes> &
      Partial<FindSegments<Optional, ParamTypes, true>> &
      FindOptional<Tail, ParamTypes>
  : FindSegments<Pattern, ParamTypes, false>;

/** Find segments split by "/". */
type FindSegments<
  Pattern extends string,
  ParamTypes,
  IsOptional extends boolean
> = Pattern extends `${infer Head}/${infer Tail}`
  ? MapSegment<Head, ParamTypes, IsOptional> &
      FindSegments<Tail, ParamTypes, IsOptional>
  : MapSegment<Pattern, ParamTypes, IsOptional>;

/**
 * Converts
 *  ":name" to { name: string }
 *  "*name" to { name: string[] } if optional
 *  "*name" to { name: [string, ...string[]] } if not optional
 */
type MapSegment<
  Segment extends string,
  ParamTypes,
  IsOptional extends boolean
> = Segment extends `:${infer Name}`
  ? { [K in Name]: ParamValue<Name, ParamTypes> }
  : Segment extends `*${infer Name}`
  ? { [K in Name]: IsOptional extends true ? string[] : [string, ...string[]] }
  : {};

/** Map known params like ":projectId" to ProjectId. */
type ParamValue<Name extends string, ParamTypes> = Name extends keyof ParamTypes
  ? ParamTypes[Name]
  : string;
