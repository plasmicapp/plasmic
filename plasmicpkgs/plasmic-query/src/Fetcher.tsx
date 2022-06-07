import { DataProvider } from "@plasmicapp/host";
import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { usePlasmicQueryData } from "@plasmicapp/query";
import React, { ReactNode } from "react";

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
  const query = usePlasmicQueryData(
    queryKey ?? JSON.stringify(fetchProps),
    () => performFetch(fetchProps)
  );
  if (!("error" in query) && !("data" in query)) {
    return <>{spinner ?? null}</>;
  } else if ("error" in query) {
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

export const dataFetcherMeta: ComponentMeta<DataFetcherProps> = {
  name: "hostless-plasmic-query-data-fetcher",
  displayName: "Data Fetcher",
  importName: "DataFetcher",
  importPath: "@plasmicpkgs/react-query",
  providesData: true,
  props: {
    url: {
      type: "string",
      defaultValue: "https://api.github.com/users/plasmicapp/repos",
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
      defaultValue: "GET",
      description: "Method to be used when fetching",
    },
    headers: {
      type: "object",
      description: "JSON object of the headers to be sent with the request",
    },
    body: {
      type: "object",
      description: "JSON object of the body to be sent with the request",
    },
    dataName: {
      type: "string",
      defaultValue: "myVariable",
      description: "Variable name to store the fetched data in",
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
