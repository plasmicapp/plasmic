import { CustomFunctionMeta } from "@plasmicapp/host/registerFunction";
import { QueryOperator, queryOperators } from "./utils";

export interface QueryWordpressOpts {
  wordpressUrl?: string;
  queryType?: "pages" | "posts";
  queryOperator?: QueryOperator;
  filterValue?: string;
  limit?: number;
}

export async function queryWordpress({
  wordpressUrl,
  queryType,
  queryOperator,
  filterValue,
  limit,
}: QueryWordpressOpts): Promise<any> {
  if (!wordpressUrl || !queryType) {
    throw new Error("Wordpress URL and query type are required");
  }
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
  const url = new URL(`wp-json/wp/v2/${queryType}`, urlWithSlash);
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
      name: "opts",
      type: "object",
      display: "flatten",
      fields: {
        wordpressUrl: {
          type: "string",
        },
        queryType: {
          type: "choice",
          options: ["pages", "posts"],
        },
        queryOperator: {
          type: "choice",
          options: Object.values(queryOperators).map((item) => ({
            label: item.label,
            value: item.value,
          })),
        },
        filterValue: {
          type: "string",
        },
        limit: {
          type: "number",
        },
      },
    },
  ],
};
