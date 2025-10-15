import { CustomFunctionMeta } from "@plasmicapp/host/registerFunction";
import { QueryOperator, queryOperators } from "./utils";

export async function queryWordpress(
  wordpressUrl: string,
  type: "pages" | "posts",
  queryOperator?: QueryOperator,
  filterValue?: string,
  limit?: number
): Promise<any> {
  const urlParams = new URLSearchParams();
  if (queryOperator && filterValue) {
    urlParams.append(queryOperator, filterValue);
  }
  if (limit) {
    urlParams.append("per_page", limit.toString());
  }
  const urlWithSlash = wordpressUrl.endsWith("/")
    ? wordpressUrl
    : `${wordpressUrl}/`;
  const url = new URL(`wp-json/wp/v2/${type}`, urlWithSlash);
  url.search = urlParams.toString();

  const resp = await fetch(url);
  return await resp.json();
}

export const queryWordpressMeta: CustomFunctionMeta<typeof queryWordpress> = {
  name: "queryWordpress",
  displayName: "Query WordPress",
  importPath: "@plasmicpkgs/wordpress",
  params: [
    {
      name: "wordpressUrl",
      type: "string",
    },
    {
      name: "queryType",
      type: "choice",
      options: ["pages", "posts"],
    },
    {
      name: "queryOperator",
      type: "choice",
      options: Object.values(queryOperators).map((item) => ({
        label: item.label,
        value: item.value,
      })),
    },
    {
      name: "filterValue",
      type: "string",
    },
    {
      name: "limit",
      type: "number",
    },
  ],
};
