import registerFunction, {
  CustomFunctionMeta,
} from "@plasmicapp/host/registerFunction";

type Registerable = {
  registerFunction: typeof registerFunction;
};

class CustomError extends Error {
  info: Record<string, any>;
  status: number;
  constructor(message: string, info: Record<string, string>, status: number) {
    super(message);
    this.name = "CustomError";
    this.info = info;
    this.status = status;
  }
}

// Some functions were extracted from platform/wab/src/wab/server/data-sources/http-fetcher.ts
type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE";

function base64StringToBuffer(bstr: string) {
  try {
    bstr = atob(bstr);
  } catch (e) {
    throw new Error("Invalid base64 for binary type");
  }
  const uint8Array = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    uint8Array[i] = bstr.charCodeAt(i);
  }
  return uint8Array.buffer;
}

function bodyToFetchBody(body?: string | object) {
  if (body == null) {
    return undefined;
  } else if (typeof body === "object") {
    return JSON.stringify(body);
  } else if (body.startsWith("@binary")) {
    return base64StringToBuffer(body.slice("@binary".length));
  } else {
    return body;
  }
}

function maybeParseJSON(json: string) {
  try {
    return JSON.parse(json);
  } catch (e) {
    return json;
  }
}

export interface FetchProps {
  url?: string;
  method?: string;
  body?: string | object;
  headers?: Record<string, string>;
}

async function performFetch({ url, method, body, headers }: FetchProps) {
  if (!url) {
    throw new Error("Please specify a URL to fetch");
  }

  // Add default headers unless specified
  if (!headers) {
    headers = {};
  }
  const headerNamesLowercase = new Set(
    Object.keys(headers).map((headerName) => headerName.toLowerCase())
  );
  if (!headerNamesLowercase.has("accept")) {
    headers["Accept"] = "application/json";
  }
  if (body && !headerNamesLowercase.has("content-type")) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    headers,
    body: bodyToFetchBody(body),
  });

  const text = await response.text();
  const maybeJson = maybeParseJSON(text);

  // @see https://swr.vercel.app/docs/error-handling
  // If the status code is not in the range 200-299,
  // we still try to parse and throw it.
  if (!response.ok) {
    throw new CustomError(response.statusText, maybeJson, response.status);
  }

  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    response: maybeJson,
  };
}

async function wrappedFetch(
  url: string,
  method: HTTPMethod,
  headers: Record<string, string>,
  body?: string | object
) {
  return await performFetch({ url, method, headers, body });
}

export { wrappedFetch as fetch };

const registerFetchParams: CustomFunctionMeta<typeof wrappedFetch> = {
  name: "fetch",
  importPath: "@plasmicpkgs/fetch",
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
      name: "body",
      type: "object",
    },
  ],
};

export function registerFetch(loader?: Registerable) {
  if (loader) {
    loader.registerFunction(wrappedFetch, registerFetchParams);
  } else {
    registerFunction(wrappedFetch, registerFetchParams);
  }
}

export async function graphqlFetch(
  url: string,
  method: HTTPMethod,
  headers: Record<string, string>,
  query?: { query?: string; variables?: object },
  varOverrides?: Record<string, any>
) {
  let fetchProps: FetchProps;
  method = method ?? "POST";

  if (method === "GET") {
    // https://graphql.org/learn/serving-over-http/#get-request-and-parameters
    const urlWithQueryParams = new URL(url ?? "");
    urlWithQueryParams.searchParams.set("query", query?.query ?? "{}");
    urlWithQueryParams.searchParams.set(
      "variables",
      JSON.stringify({ ...query?.variables, ...varOverrides })
    );
    fetchProps = {
      url: urlWithQueryParams.toString(),
      method,
      headers,
    };
  } else {
    fetchProps = {
      body: { ...query, variables: { ...query?.variables, ...varOverrides } },
      url,
      method,
      headers,
    };
  }

  return performFetch(fetchProps);
}

const registerGraphqlFetchParams: CustomFunctionMeta<typeof graphqlFetch> = {
  name: "graphqlFetch",
  importPath: "@plasmicpkgs/fetch",
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

export function registerGraphqlFetch(loader?: Registerable) {
  if (loader) {
    loader.registerFunction(graphqlFetch, registerGraphqlFetchParams);
  } else {
    registerFunction(graphqlFetch, registerGraphqlFetchParams);
  }
}
