import registerFunction, {
  CustomFunctionMeta,
} from "@plasmicapp/host/registerFunction";

type Registerable = {
  registerFunction: typeof registerFunction;
};

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

async function wrappedFetch(
  url: string,
  method: HTTPMethod,
  headers: Record<string, string>,
  body?: string | object
) {
  const response = await fetch(url, {
    method,
    headers,
    body: bodyToFetchBody(body),
  });

  const statusCode = response.status;
  const responseText = await response.text();

  return {
    statusCode,
    headers: Object.fromEntries(response.headers.entries()),
    response: maybeParseJSON(responseText),
  };
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
