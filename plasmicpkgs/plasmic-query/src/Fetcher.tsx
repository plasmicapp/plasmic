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
  noLayout?: boolean;
  className?: string;
}

type PropMetas<P> = ComponentMeta<P>["props"];

export const genericFetcherPropsMeta: PropMetas<GenericFetcherProps> = {
  children: "slot",
  loadingDisplay: { type: "slot", defaultValue: "Loading..." },
  errorDisplay: { type: "slot", defaultValue: "Error fetching data" },
  dataName: {
    type: "string",
    displayName: "Variable name",
    defaultValue: "fetchedData",
    description: "Variable name to store the fetched data in",
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
    return <>{errorDisplay ?? null}</>;
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
  body?: string | {};
  headers?: Record<string, string>;
}

/**
 * Tries to return the JSON response, or else returns an object with a text key containing the response body text.
 */
async function performFetch({ url, method, body, headers }: FetchProps) {
  if (!url) {
    throw new Error("Please specify a URL to fetch");
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
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    return { text };
  }
}

export interface DataFetcherProps extends FetchProps, GenericFetcherProps {
  queryKey?: string;
}

export function DataFetcher(props: DataFetcherProps) {
  const { url, method, body, headers, queryKey } = props;
  const fetchProps: FetchProps = { url, method, body, headers };
  const result = usePlasmicQueryData(
    queryKey ?? JSON.stringify({ type: "DataFetcher", ...fetchProps }),
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
      description: "JSON object of the headers to be sent with the request",
      defaultValue: {
        "Content-type": "application/json",
      },
    },
    queryKey: {
      type: "string",
      description:
        "A globally unique ID for this query, used for invalidating queries",
    },
  };
}

export const dataFetcherMeta: ComponentMeta<DataFetcherProps> = {
  name: "hostless-plasmic-query-data-fetcher",
  displayName: "REST API Fetcher",
  importName: "DataFetcher",
  importPath: "@plasmicpkgs/plasmic-query",
  providesData: true,
  props: {
    ...(mkFetchProps(
      "https://api.github.com/users/plasmicapp/repos",
      "GET"
    ) as any),
    body: {
      type: "object",
      description: "JSON object of the body to be sent with the request",
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
  query?: string;
  queryKey?: string;
}

export function GraphqlFetcher(props: GraphqlFetcherProps) {
  const { query, url, method, headers, queryKey } = props;
  const fetchProps: FetchProps = {
    body: query,
    url,
    method,
    headers,
  };
  const result = usePlasmicQueryData(
    queryKey ?? JSON.stringify({ type: "GraphqlFetcher", ...fetchProps }),
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
        endpoint: (props) => props.url ?? "",
        defaultValue: {
          query: `{
  characters {
    results {
      name
      species
      image
    }
  }
}
`,
        },
      },
    };
    // Reorder the props
    const { url, query, method, headers, queryKey, ...rest } = {
      ...mkFetchProps("https://rickandmortyapi.com/graphql", "POST"),
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
