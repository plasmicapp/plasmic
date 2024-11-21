import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";
import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { usePlasmicQueryData } from "@plasmicapp/query";
import React, { ReactNode } from "react";

export interface GenericFetcherProps {
  children?: ReactNode;
  loadingDisplay?: ReactNode;
  previewSpinner?: boolean;
  errorDisplay?: ReactNode;
  previewErrorDisplay?: boolean;
  dataName?: string;
  errorName?: string;
  noLayout?: boolean;
  className?: string;
}

type PropMetas<P> = ComponentMeta<P>["props"];

type CustomError = Error & {
  info: Record<string, any>;
  status: number;
};

export const genericFetcherPropsMeta: PropMetas<GenericFetcherProps> = {
  children: "slot",
  loadingDisplay: { type: "slot", defaultValue: "Loading..." },
  errorDisplay: { type: "slot", defaultValue: "Error fetching data" },
  dataName: {
    type: "string",
    displayName: "Data name",
    defaultValue: "fetchedData",
    description: "Variable name to store the fetched data in",
  },
  errorName: {
    type: "string",
    displayName: "Error name",
    defaultValue: "fetchError",
    description: "Variable name to store the fetch error in",
  },
  previewSpinner: {
    type: "boolean",
    description: "Force preview the loading state",
    displayName: "Preview loading",
  },
  previewErrorDisplay: {
    type: "boolean",
    description: "Force preview the error display",
    displayName: "Preview error",
  },
  noLayout: {
    type: "boolean",
    displayName: "No layout",
    description:
      "When set, CMS Data Loader will not layout its children; instead, the layout set on its parent element will be used. Useful if you want to set flex gap or control container tag type.",
    defaultValue: false,
  },
};

export function GenericFetcherShell<T>({
  result,
  children,
  loadingDisplay,
  previewSpinner,
  errorDisplay,
  previewErrorDisplay,
  dataName,
  errorName,
  noLayout,
  className,
}: GenericFetcherProps & {
  result: { data?: T; error?: Error; isLoading?: boolean };
}) {
  const inEditor = !!usePlasmicCanvasContext();
  if (
    (inEditor && previewSpinner) ||
    (!("error" in result) && !("data" in result))
  ) {
    return <>{loadingDisplay ?? null}</>;
  } else if ((inEditor && previewErrorDisplay) || "error" in result) {
    return (
      <DataProvider name={errorName} data={result.error}>
        {errorDisplay ?? null}
      </DataProvider>
    );
  } else {
    const content = (
      <DataProvider name={dataName} data={result.data}>
        {children}
      </DataProvider>
    );
    return noLayout ? content : <div className={className}>{content}</div>;
  }
}

export interface FetchProps {
  url?: string;
  method?: string;
  body?: string | object;
  headers?: Record<string, string>;
}

/**
 * Tries to return the JSON response, or else returns an object with a text key containing the response body text.
 */
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
    body:
      body === undefined
        ? body
        : typeof body === "string"
        ? body
        : JSON.stringify(body),
  });

  const text = await response.text();
  let json: Record<string, any> = { text };

  try {
    json = JSON.parse(text);
  } catch (e) {
    json = { text };
  }

  // @see https://swr.vercel.app/docs/error-handling
  // If the status code is not in the range 200-299,
  // we still try to parse and throw it.
  if (!response.ok) {
    const error = new Error(response.statusText) as CustomError;
    // Attach extra info to the error object.
    error.info = json;
    error.status = response.status;
    throw error;
  }

  return json;
}

export interface DataFetcherProps extends FetchProps, GenericFetcherProps {
  queryKey?: string;
}

export function DataFetcher(props: DataFetcherProps) {
  const { url, method, body, headers, queryKey } = props;
  const fetchProps: FetchProps = { url, method, body, headers };
  const result = usePlasmicQueryData(
    queryKey || JSON.stringify({ type: "DataFetcher", ...fetchProps }),
    () => performFetch(fetchProps)
  );
  return <GenericFetcherShell result={result} {...props} />;
}

function mkFetchProps(
  defaultUrl: string,
  defaultMethod: string
): PropMetas<FetchProps & { queryKey?: string }> {
  return {
    url: {
      type: "string",
      defaultValue: defaultUrl,
      description: "Where to fetch the data from",
    },
    method: {
      type: "choice",
      options: [
        "GET",
        "DELETE",
        "CONNECT",
        "HEAD",
        "OPTIONS",
        "POST",
        "PUT",
        "TRACE",
      ],
      defaultValue: defaultMethod,
      description: "Method to use when fetching",
    },
    headers: {
      type: "object",
      description: "Request headers (as JSON object) to send",
    },
    queryKey: {
      type: "string",
      description:
        "A globally unique ID for this query, used for invalidating queries",
      invariantable: true,
    },
  };
}

export const dataFetcherMeta: ComponentMeta<DataFetcherProps> = {
  name: "hostless-plasmic-query-data-fetcher",
  displayName: "HTTP REST API Fetcher",
  importName: "DataFetcher",
  importPath: "@plasmicpkgs/plasmic-query",
  providesData: true,
  description:
    "These fetches may be run client-side (from the browser). Use [Data Queries](https://docs.plasmic.app/learn/http-api-integration/) for authenticated queries or CORS.",
  props: {
    ...(mkFetchProps(
      "https://api.github.com/users/plasmicapp/repos",
      "GET"
    ) as any),
    body: {
      type: "object",
      description: "JSON object to be sent in the request body",
    },
    ...(genericFetcherPropsMeta as any),
  },
  defaultStyles: {
    maxWidth: "100%",
    width: "stretch",
  },
};

export function registerDataFetcher(
  loader?: { registerComponent: typeof registerComponent },
  customDataFetcherMeta?: ComponentMeta<DataFetcherProps>
) {
  if (loader) {
    loader.registerComponent(
      DataFetcher,
      customDataFetcherMeta ?? dataFetcherMeta
    );
  } else {
    registerComponent(DataFetcher, customDataFetcherMeta ?? dataFetcherMeta);
  }
}

export interface GraphqlFetcherProps
  extends GenericFetcherProps,
    Omit<FetchProps, "body"> {
  query?: { query?: string; variables?: object };
  queryKey?: string;
  varOverrides?: object;
}

export function GraphqlFetcher(props: GraphqlFetcherProps) {
  const { query, url, method, headers, queryKey, varOverrides } = props;

  let fetchProps: FetchProps;
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

  const result = usePlasmicQueryData(
    queryKey || JSON.stringify({ type: "GraphqlFetcher", ...fetchProps }),
    () => performFetch(fetchProps)
  );
  return <GenericFetcherShell result={result} {...props} />;
}

export const graphqlFetcherMeta: ComponentMeta<GraphqlFetcherProps> = {
  name: "hostless-plasmic-query-graphql-fetcher",
  displayName: "GraphQL Fetcher",
  importName: "GraphqlFetcher",
  importPath: "@plasmicpkgs/plasmic-query",
  providesData: true,
  props: (() => {
    const gqlMetas: PropMetas<GraphqlFetcherProps> = {
      query: {
        type: "code",
        lang: "graphql",
        headers: (props) => props.headers,
        endpoint: (props) => props.url ?? "",
        defaultValue: {
          query: `query ExampleQuery($personId: ID) {
  person(id: $personId) {
    id
    name
    skinColor
    filmConnection {
      films {
        id
        title
      }
    }
  }
}
`,
          variables: {
            personId: "cGVvcGxlOjIw", // Yoda
          },
        },
      },
      varOverrides: {
        type: "object",
        displayName: "Override variables",
        description:
          "Pass in dynamic values for your query variables, as an object of key-values",
      },
    };
    // Reorder the props
    const { url, query, method, headers, queryKey, ...rest } = {
      ...mkFetchProps(
        "https://swapi-graphql.netlify.app/.netlify/functions/index",
        "POST"
      ),
      ...gqlMetas,
      ...genericFetcherPropsMeta,
    };
    return {
      url,
      query,
      method,
      headers,
      queryKey,
      ...rest,
    } as any;
  })(),
  defaultStyles: {
    maxWidth: "100%",
    width: "stretch",
  },
};

export function registerGraphqlFetcher(
  loader?: { registerComponent: typeof registerComponent },
  customDataFetcherMeta?: ComponentMeta<GraphqlFetcherProps>
) {
  if (loader) {
    loader.registerComponent(
      GraphqlFetcher,
      customDataFetcherMeta ?? graphqlFetcherMeta
    );
  } else {
    registerComponent(
      GraphqlFetcher,
      customDataFetcherMeta ?? graphqlFetcherMeta
    );
  }
}

export function registerAll(loader?: {
  registerComponent: typeof registerComponent;
}) {
  registerDataFetcher(loader);
  registerGraphqlFetcher(loader);
}
