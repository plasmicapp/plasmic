import registerFunction, {
  CustomFunctionMeta,
} from "@plasmicapp/host/registerFunction";

type Registerable = {
  registerFunction: typeof registerFunction;
};

class HttpError extends Error {
  constructor(
    statusText: string,
    readonly info: unknown,
    readonly status: number
  ) {
    super(statusText);
    this.name = "HttpError";
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

// Don't override the global fetch
async function wrappedFetch(
  url: string,
  method: HTTPMethod,
  headers: Record<string, string>,
  body?: string | object
) {
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
    throw new HttpError(response.statusText, maybeJson, response.status);
  }

  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: maybeJson,
  };
}

export { wrappedFetch as fetch };

const registerFetchParams: CustomFunctionMeta<typeof wrappedFetch> = {
  name: "fetch",
  importPath: "@plasmicpkgs/fetch",
  displayName: "HTTP Fetch",
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
