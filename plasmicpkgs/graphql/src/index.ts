import registerFunction, {
  CustomFunctionMeta,
} from "@plasmicapp/host/registerFunction";
import { fetch } from "@plasmicpkgs/fetch";

type Registerable = {
  registerFunction: typeof registerFunction;
};

export async function fetchGraphQL(
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  headers: Record<string, string>,
  request: { query: string; variables?: object },
  varOverrides?: Record<string, any>
) {
  url = url ?? "";
  method = method ?? "POST";
  request = request ?? { query: "" };

  if (method === "GET") {
    // https://graphql.org/learn/serving-over-http/#get-request-and-parameters
    const urlWithQueryParams = new URL(url);
    urlWithQueryParams.searchParams.set("query", request.query);
    urlWithQueryParams.searchParams.set(
      "variables",
      JSON.stringify({ ...request.variables, ...varOverrides })
    );
    return fetch(urlWithQueryParams.toString(), "GET", headers);
  } else {
    return fetch(url, method, headers, {
      query: request.query,
      variables: { ...request.variables, ...varOverrides },
    });
  }
}

const registerGraphqlFetchParams: CustomFunctionMeta<typeof fetchGraphQL> = {
  name: "fetchGraphQL",
  importPath: "@plasmicpkgs/graphql",
  params: [
    {
      name: "url",
      type: "string",
    },
    {
      name: "method",
      type: "choice",
      options: ["GET", "POST", "PUT", "DELETE"],
    },
    {
      name: "headers",
      type: "object",
    },
    {
      name: "query",
      type: "code",
      lang: "graphql",
      headers: (props: any) => props.headers,
      endpoint: (props: any) => props.url ?? "",
    },
    {
      name: "varOverrides",
      type: "object",
    },
  ],
  // TODO: remove as any when "code" type is available
} as any;

export function registerGraphQL(loader?: Registerable) {
  if (loader) {
    loader.registerFunction(fetchGraphQL, registerGraphqlFetchParams);
  } else {
    registerFunction(fetchGraphQL, registerGraphqlFetchParams);
  }
}
