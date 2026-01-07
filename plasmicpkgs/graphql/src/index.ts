import registerFunction, {
  CustomFunctionMeta,
} from "@plasmicapp/host/registerFunction";
import { fetch } from "@plasmicpkgs/fetch";

type Registerable = {
  registerFunction: typeof registerFunction;
};

export interface FetchGraphQLOpts {
  url?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  request: { query: string; variables?: object };
  varOverrides?: Record<string, any>;
}

export async function fetchGraphQL({
  url,
  method,
  headers = {},
  request,
  varOverrides,
}: FetchGraphQLOpts) {
  if (!url || !method || !request) {
    throw new Error("url, method, and request are required");
  }

  if (method === "GET") {
    // https://graphql.org/learn/serving-over-http/#get-request-and-parameters
    const urlWithQueryParams = new URL(url);
    urlWithQueryParams.searchParams.set("query", request.query);
    urlWithQueryParams.searchParams.set(
      "variables",
      JSON.stringify({ ...request.variables, ...varOverrides })
    );
    return fetch({
      url: urlWithQueryParams.toString(),
      method: "GET",
      headers,
    });
  } else {
    return fetch({
      url,
      method,
      headers,
      body: {
        query: request.query,
        variables: { ...request.variables, ...varOverrides },
      },
    });
  }
}

const registerGraphqlFetchParams: CustomFunctionMeta<typeof fetchGraphQL> = {
  name: "fetchGraphQL",
  importPath: "@plasmicpkgs/graphql",
  displayName: "GraphQL",
  params: [
    {
      name: "opts",
      type: "object",
      display: "flatten",
      fields: {
        url: {
          type: "string",
        },
        method: {
          type: "choice",
          options: ["GET", "POST", "PUT", "DELETE"],
        },
        headers: {
          type: "object",
        },
        request: {
          type: "code",
          lang: "graphql",
          headers: ([opts]) => opts?.headers,
          endpoint: ([opts]) => opts?.url ?? "",
        },
        varOverrides: {
          type: "object",
        },
      },
    },
  ],
};

export function registerGraphQL(loader?: Registerable) {
  if (loader) {
    loader.registerFunction(fetchGraphQL, registerGraphqlFetchParams);
  } else {
    registerFunction(fetchGraphQL, registerGraphqlFetchParams);
  }
}
