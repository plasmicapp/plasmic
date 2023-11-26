import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";
import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { SWRResponse, SWRConfiguration, useSWRConfig, Cache } from "swr";
import useSWRMutation, {
  SWRMutationResponse,
  SWRMutationConfiguration,
} from "swr/mutation";
import React, { ReactNode } from "react";
import { useMutablePlasmicQueryData, usePlasmicDataConfig } from "@plasmicapp/react-web/lib/query";

export interface GenericFetcherProps
  extends Omit<FetcherOptions, "isVisible" | "isOnline"> {
  children?: ReactNode;
  loadingDisplay?: ReactNode;
  previewSpinner?: boolean;
  errorDisplay?: ReactNode;
  previewErrorDisplay?: boolean;
  dataName?: string;
  errorName?: string;
  noLayout?: boolean;
  className?: string;
  onResultChange?: (result: FetcherResult) => void;
  useMutation?: boolean;
  disabled?: boolean;
}

type PropMetas<P> = ComponentMeta<P>["props"];

type CustomError = Error & {
  info: Record<string, any>;
  status: number;
};

type FetcherQueryResult = SWRResponse<any, CustomError>;

type FetcherMutationResult = SWRMutationResponse<any, CustomError>

type FetcherResult = FetcherQueryResult & FetcherMutationResult;

type FetcherOptions = SWRConfiguration<any, CustomError>  & {
  cache: Cache<any>;
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
    invariantable: true,
  },
  errorName: {
    type: "string",
    displayName: "Error name",
    defaultValue: "error",
    description: "Variable name to store the fetch error in",
    advanced: true,
    invariantable: true,
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
    advanced: true,
  },
  useMutation: {
    type: "boolean",
    displayName: "Use mutation",
    description:
      "Whether to use a mutation instead of a query. Useful for POST, PUT, DELETE, etc.",
    defaultValue: false,
  },
  disabled: {
    type: "boolean",
    displayName: "Disabled",
    description: "Whether to disable the fetcher",
    defaultValue: false,
  },
  onResultChange: {
    type: "eventHandler",
    argTypes: [
      {
        name: "result",
        type: "object",
      },
    ],
    description:
      "Event handler to run when the fetch result is changing. The handler receives the fetch result as an argument.",
  },
  suspense: {
    type: "boolean",
    description:
      "Whether to enable Suspense mode. When enabled, the fetcher will throw a Promise that can be caught by a Suspense boundary.",
    defaultValue: false,
    advanced: true,
    invariantable: true,
  },
  fetcher: {
    type: "code",
    lang: "javascript",
    description:
      "Custom fetcher function. If not specified, the default fetcher will be used.",
    advanced: true,
    invariantable: true,
  },
  revalidateIfStale: {
    type: "boolean",
    description:
      "Whether to revalidate the data if it's stale (not fresh). By default, SWR will only revalidate the data when it's re-rendered.",
    defaultValue: false,
    advanced: true,
    invariantable: true,
  },
  revalidateOnMount: {
    type: "boolean",
    description:
      "Whether to revalidate the data when the component is mounted.",
    defaultValue: true,
    advanced: true,
    invariantable: true,
  },
  revalidateOnFocus: {
    type: "boolean",
    description:
      "Whether to revalidate the data when the browser window regains focus.",
    defaultValue: false,
    advanced: true,
    invariantable: true,
  },
  revalidateOnReconnect: {
    type: "boolean",
    description:
      "Whether to revalidate the data when the browser regains network connection.",
    defaultValue: false,
    advanced: true,
    invariantable: true,
  },
  refreshInterval: {
    type: "number",
    description:
      "The polling interval (in milliseconds) when using the default fetcher.",
    defaultValue: 0,
    advanced: true,
    invariantable: true,
  },
  refreshWhenHidden: {
    type: "boolean",
    description:
      "Whether to revalidate the data when the browser window is hidden.",
    defaultValue: false,
    advanced: true,
    invariantable: true,
  },
  refreshWhenOffline: {
    type: "boolean",
    description:
      "Whether to revalidate the data when the browser regains network connection.",
    defaultValue: false,
    advanced: true,
    invariantable: true,
  },
  shouldRetryOnError: {
    type: "boolean",
    description:
      "Whether to retry when a request fails (after the onError handler is called).",
    defaultValue: true,
    advanced: true,
    invariantable: true,
  },
  dedupingInterval: {
    type: "number",
    description:
      "The interval (in milliseconds) to dedupe requests. When a request is deduped, the previously created request will be returned.",
    defaultValue: 2000,
    advanced: true,
    invariantable: true,
  },
  focusThrottleInterval: {
    type: "number",
    description:
      "The interval (in milliseconds) to throttle the focus revalidation.",
    defaultValue: 5000,
    advanced: true,
    invariantable: true,
  },
  loadingTimeout: {
    type: "number",
    description:
      "The time (in milliseconds) before triggering the onLoadingSlow event.",
    defaultValue: 3000,
    advanced: true,
    invariantable: true,
  },
  errorRetryInterval: {
    type: "number",
    description:
      "The interval (in milliseconds) to retry when a request fails.",
    defaultValue: 5000,
    advanced: true,
    invariantable: true,
  },
  errorRetryCount: {
    type: "number",
    description:
      "The maximum number of retries when a request fails. Set to 0 to disable retrying.",
    defaultValue: 3,
    advanced: true,
  },
  fallback: {
    type: "object",
    description:
      "The fallback data to return while the request is still pending.",
    defaultValue: {},
    advanced: true,
  },
  fallbackData: {
    type: "object",
    description:
      "The initial data to return while the request is still pending.",
    defaultValue: {},
    advanced: true,
  },
  keepPreviousData: {
    type: "boolean",
    description:
      "Whether to keep the previous data when the request is revalidated.",
    defaultValue: false,
    advanced: true,
    invariantable: true,
  },
  onLoadingSlow: {
    type: "eventHandler",
    argTypes: [
      {
        name: "key",
        type: "string",
      },
      {
        name: "config",
        type: "object",
      },
    ],
    description:
      "Event handler to run when a request takes too long to load. The handler receives the query key and the fetch config as arguments.",
    advanced: true,
    invariantable: true,
  },
  onSuccess: {
    type: "eventHandler",
    argTypes: [
      {
        name: "data",
        type: "object",
      },
      {
        name: "key",
        type: "string",
      },
      {
        name: "config",
        type: "object",
      },
    ],
    description:
      "Event handler to run when the fetch is successful. The handler receives the fetched data, the query key, and the fetch config as arguments.",
  },
  onError: {
    type: "eventHandler",
    argTypes: [
      {
        name: "error",
        type: "object",
      },
      {
        name: "key",
        type: "string",
      },
      {
        name: "config",
        type: "object",
      },
    ],
    description:
      "Event handler to run when the fetch fails. The handler receives the error, the query key, and the fetch config as arguments.",
  },
  onErrorRetry: {
    type: "eventHandler",
    argTypes: [
      {
        name: "error",
        type: "object",
      },
      {
        name: "key",
        type: "string",
      },
      {
        name: "config",
        type: "object",
      },
      {
        name: "revalidate",
        type: "exprEditor",
      },
      {
        name: "revalidateOps",
        type: "object",
      },
    ],
    description:
      "Event handler to run when the fetch fails and should retry. The handler receives the error, the query key, the fetch config, the revalidate function, and the revalidate options as arguments.",
    advanced: true,
    invariantable: true,
  },
  onDiscarded: {
    type: "eventHandler",
    argTypes: [
      {
        name: "key",
        type: "string",
      },
    ],
    description: "Event handler to run when a request is ignored.",
    advanced: true,
    invariantable: true,
  },
  compare: {
    type: "exprEditor",
    description:
      "Comparison function used to detect when returned data has changed. The handler receives the previous data and the current data as arguments.",
    advanced: true,
    invariantable: true,
  },
  isPaused: {
    type: "exprEditor",
    description:
      "Function to detect whether pause revalidations. The handler receives no arguments.",
    advanced: true,
    invariantable: true,
  },
  use: {
    type: "array",
    description: "Array of middleware functions.",
    advanced: true,
    invariantable: true,
  },
};

export const genericFetcherStates: ComponentMeta<GenericFetcherProps>["states"] =
  {
    result: {
      type: "readonly",
      initVal: {},
      variableType: "object",
      onChangeProp: "onResultChange",
    },
  };

type SWRHooksProps = {
  key: string;
  fetcher: () => Promise<any>;
  config: FetcherOptions;
  disabled?: boolean;
  useMutation?: boolean;
};

function useSWRHooks({
  key,
  fetcher,
  config,
  disabled = false,
  useMutation = false,
}: SWRHooksProps) {
  const configDefault = useSWRConfig();
  
  // Used in plasmic prepass and should override the default config
  const plasmicConfig = usePlasmicDataConfig();
  const {suspense, fallback = {}, fallbackData = {}, cache} = plasmicConfig;
  
  // We need to preserve the use middlewares array to support SWR DevTools https://swr-devtools.vercel.app/ 
  const defaltUse = configDefault.use || [];
  const configUse = config.use || [];
  const use = [...defaltUse, ...configUse];
  
  config = clearOptionValues({ 
    ...configDefault, 
    ...config,
    suspense,
    cache: cache as any,
    fallback: Object.assign(fallback, config.fallback || {}),
    // Allow overriding the fallbackData
    fallbackData: Object.keys(config.fallbackData || {}).length ? Object.assign(fallbackData, config.fallbackData) : undefined,
    use
  });

  // We can't use useSWR here because it breaks the Plasmic prepass
  // See: https://github.com/vercel/swr/issues/1832#issuecomment-1354106993
  const { data, error, isLoading, isValidating, mutate } = useMutablePlasmicQueryData(
    !disabled && !useMutation ? key : null,
    fetcher,
    config as any
  );

  const {
    isMutating,
    reset,
    trigger,
    data: mutationData,
    error: mutationError,
  } = useSWRMutation(
    !disabled && useMutation ? key : null,
    fetcher,
    config as SWRMutationConfiguration<any, CustomError>
  );

  const result = {
    data: useMutation ? mutationData : data,
    error: useMutation ? mutationError : error,
    isLoading,
    isValidating,
    mutate,
    isMutating,
    reset,
    trigger,
  } as FetcherResult;

  return { result };
}

export function GenericFetcherShell({
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
  onResultChange,
}: GenericFetcherProps & { result: FetcherResult }) {
  const inEditor = !!usePlasmicCanvasContext();

  const { isLoading, isValidating, isMutating } = result;
  React.useEffect(() => {
    onResultChange?.(result);
  }, [isLoading, isValidating, isMutating]);

  if ((inEditor && previewSpinner) || isValidating || isMutating || !result.data) {
    return <>{loadingDisplay ?? null}</>;
  }
  if ((inEditor && previewErrorDisplay) || result.error) {
    return (
      <DataProvider name={errorName} data={result.error}>
        {errorDisplay ?? null}
      </DataProvider>
    );
  }
  const content = (
    <DataProvider name={dataName} data={result.data}>
      {children}
    </DataProvider>
  );
  return noLayout ? content : <div className={className}>{content}</div>;
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
    // Ignore
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

function clearOptionValues(options: FetcherOptions) {
  return Object.fromEntries(
    Object.entries(options).filter(([_, v]) => v !== undefined)
  ) as FetcherOptions;
}

function getFetcherOptions(props: DataFetcherProps): FetcherOptions {
  const {
    suspense,
    fetcher,
    revalidateIfStale,
    revalidateOnMount,
    revalidateOnFocus,
    revalidateOnReconnect,
    refreshInterval,
    refreshWhenHidden,
    refreshWhenOffline,
    shouldRetryOnError,
    dedupingInterval,
    focusThrottleInterval,
    loadingTimeout,
    errorRetryInterval,
    errorRetryCount,
    fallback,
    fallbackData,
    keepPreviousData,
    onLoadingSlow,
    onSuccess,
    onError,
    onErrorRetry,
    onDiscarded,
    compare,
    isPaused,
    use,
  } = props;

  const options = {
    suspense,
    fetcher,
    revalidateIfStale,
    revalidateOnMount,
    revalidateOnFocus,
    revalidateOnReconnect,
    refreshInterval,
    refreshWhenHidden,
    refreshWhenOffline,
    shouldRetryOnError,
    dedupingInterval,
    focusThrottleInterval,
    loadingTimeout,
    errorRetryInterval,
    errorRetryCount,
    fallback,
    fallbackData,
    keepPreviousData,
    onLoadingSlow,
    onSuccess,
    onError,
    onErrorRetry,
    onDiscarded,
    compare,
    isPaused,
    use,
  };

  return clearOptionValues(options as FetcherOptions)
}

export function DataFetcher(props: DataFetcherProps) {
  const { url, method, body, headers, queryKey, disabled, useMutation } = props;

  const fetchProps: FetchProps = { url, method, body, headers };

  const key =
    queryKey || JSON.stringify({ type: "DataFetcher", ...fetchProps });

  const fetcher = () => performFetch(fetchProps);

  const config = getFetcherOptions(props);

  const { result } = useSWRHooks({
    key,
    fetcher,
    config,
    disabled,
    useMutation,
  });

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
      defaultValue: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
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
  states: genericFetcherStates,
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
  const {
    query,
    url,
    method,
    headers,
    queryKey,
    varOverrides,
    disabled,
    useMutation,
  } = props;
  const fetchProps: FetchProps = {
    body: { ...query, variables: { ...query?.variables, ...varOverrides } },
    url,
    method,
    headers,
  };

  const key =
    queryKey || JSON.stringify({ type: "DataFetcher", ...fetchProps });

  const fetcher = () => performFetch(fetchProps);

  const config = getFetcherOptions(props);

  const { result } = useSWRHooks({
    key,
    fetcher,
    config,
    disabled,
    useMutation,
  });

  return <GenericFetcherShell result={result} {...props} />;
}

export const graphqlFetcherMeta: ComponentMeta<GraphqlFetcherProps> = {
  name: "hostless-plasmic-query-graphql-fetcher",
  displayName: "GraphQL Fetcher",
  importName: "GraphqlFetcher",
  importPath: "@plasmicpkgs/plasmic-query",
  providesData: true,
  states: genericFetcherStates,
  props: (() => {
    const gqlMetas: PropMetas<GraphqlFetcherProps> = {
      query: {
        type: "code",
        lang: "graphql",
        headers: (props) => props.headers,
        endpoint: (props) => props.url ?? "",
        defaultValue: {
          query: `query MyQuery($name: String) {
                    characters(filter: {name: $name}) {
                      results {
                        name
                        species
                        image
                      }
                    }
                  }
                  `,
          variables: {
            name: "Rick Sanchez",
          },
        },
      },
      varOverrides: {
        type: "object",
        displayName: "Override variables",
        description:
          "Pass in dynamic values for your query variables, as an object of key-values",
        defaultValue: {},
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
