import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { DataProvider } from "@plasmicpkgs/plasmic-basic-components";
import React, { ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "react-query";

export interface FetchProps {
  url: string;
  method?: string;
  body?: any;
  headers?: any;
}

async function performFetch({ url, method, body, headers }: FetchProps) {
  const response = await fetch(url, {
    method,
    headers,
    body,
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

export interface DataFetcherProps extends FetchProps {
  children?: ReactNode;
  spinner?: ReactNode;
  previewSpinner?: boolean;
  errorDisplay?: ReactNode;
  previewErrorDisplay?: boolean;
  queryKey?: string;
  dataName?: string;
}

export function DataFetcher({
  queryKey,
  children,
  spinner,
  previewSpinner,
  errorDisplay,
  previewErrorDisplay,
  dataName,
  ...fetchProps
}: DataFetcherProps) {
  const query = useQuery(queryKey ?? JSON.stringify(fetchProps), () =>
    performFetch(fetchProps)
  );
  if (query.status === "loading") {
    return <>{spinner ?? null}</>;
  } else if (query.status === "error") {
    return <>{errorDisplay ?? null}</>;
  } else {
    return (
      <DataProvider name={dataName ?? queryKey} data={query.data}>
        {children}
      </DataProvider>
    );
  }
}

export interface PlasmicQueryProviderProps {
  children: ReactNode;
}

export function PlasmicQueryProvider({ children }: PlasmicQueryProviderProps) {
  const queryClient = new QueryClient({});
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export const dataFetcherMeta: ComponentMeta<DataFetcherProps> = {
  name: "hostless-data-fetcher",
  displayName: "Data Fetcher",
  importName: "DataFetcher",
  importPath: "@plasmicpkgs/react-query",
  props: {
    url: {
      type: "string",
      defaultValue: "https://api.github.com/users/plasmicapp/repos",
      description: "Where to fetch the data from"
    },
    method: {
      type: "choice",
      options: ["GET", "DELETE", "CONNECT", "HEAD", "OPTIONS", "POST", "PUT", "TRACE"],
      description: "Method to be used when fetching"
    },
    headers: "object",
    body: "object",
    dataName: {
      type: "string",
      defaultValue: "myVariable",
      description: "Variable name to store the fetched data in"
    },
    children: "slot",
  },
  defaultStyles: {
    maxWidth: "100%",
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

export const plasmicQueryProviderMeta: ComponentMeta<PlasmicQueryProviderProps> = {
  name: "hostless-plasmic-query-provider",
  displayName: "Query Client Provider",
  importName: "PlasmicQueryProvider",
  importPath: "@plasmicpkgs/react-query",
  props: {
    children: "slot"
  }
}

export function registerPlasmicQueryProvider(
  loader?: { registerComponent: typeof registerComponent },
  customPlasmicQueryProviderMeta?: ComponentMeta<PlasmicQueryProviderProps>
) {
  if (loader) {
    loader.registerComponent(PlasmicQueryProvider, customPlasmicQueryProviderMeta ?? plasmicQueryProviderMeta);
  } else {
    registerComponent(PlasmicQueryProvider, customPlasmicQueryProviderMeta ?? plasmicQueryProviderMeta);
  }
}
