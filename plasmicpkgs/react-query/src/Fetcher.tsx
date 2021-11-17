import registerComponent from "@plasmicapp/host/registerComponent";
import React, { ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "react-query";
import { DataProvider } from "@plasmicpkgs/plasmic-basic-components/Data";

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

export function PlasmicQueryProvider({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({});
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

registerComponent(DataFetcher, {
  name: "DataFetcher",
  importPath: "@plasmicpkgs/react-query/dist/Fetcher",
  props: {
    src: {
      type: "string",
      defaultValue: "https://www.example.com",
    },
  },
  defaultStyles: {
    maxWidth: "100%",
  },
});

/*

TODO

registerContext(PlasmicQueryProvider, {
  name: "React Query",
  description: "React Query Context",
  defaultValue: ReactQueryContext,
})
 */
