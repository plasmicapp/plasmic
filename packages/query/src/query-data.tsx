import React, { PropsWithChildren } from 'react';
import useSWR, { SWRConfig, SWRConfiguration } from 'swr';

/**
 * Fetches data asynchronously. This data should be considered immutable for the
 * session -- there is no way to invalidate or re-fetch this data.
 *
 * @param key a unique key for this data fetch; if data already exists under this
 *   key, that data is returned immediately.
 * @param fetcher an async function that resolves to the fetched data.
 * @returns an object with either a "data" key with the fetched data if the fetch
 *   was successful, or an "error" key with the thrown Error if the fetch failed.
 */
export function usePlasmicQueryData<T>(
  key: string,
  fetcher: () => Promise<T>
): { data?: T } | { error: Error } {
  const prepassCtx = React.useContext(PrepassContext);

  // @plasmicapp/query is optimized for SSR, so we do not revalidate
  // automatically upon hydration; as if the data is immutable.
  const opts: SWRConfiguration = {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  };
  if (prepassCtx) {
    // If we're doing prepass, then we are always in suspense mode, because
    // react-ssr-prepass only works with suspense-throwing data fetching.
    opts.suspense = true;
  }
  const resp = useSWR(key, fetcher, opts);
  if (resp.data) {
    return { data: resp.data };
  } else if (resp.error) {
    return { error: resp.error };
  } else {
    return {};
  }
}

export function PlasmicQueryDataProvider(props: {
  suspense?: boolean;
  children: React.ReactNode;
  prefetchedCache?: Record<string, any>;
}) {
  const { children, suspense, prefetchedCache } = props;
  const prepass = React.useContext(PrepassContext);
  if (prepass) {
    // If we're in prepass, then there's already a wrappign SWRConfig;
    // don't interfere with it.
    return <>{children}</>;
  } else {
    return (
      <SWRConfig
        value={{
          fallback: prefetchedCache,
          suspense,
        }}
      >
        {children}
      </SWRConfig>
    );
  }
}

const PrepassContext = React.createContext<boolean>(false);

export function PlasmicPrepassContext(
  props: PropsWithChildren<{
    cache: Map<string, any>;
  }>
) {
  const { cache, children } = props;
  return (
    <PrepassContext.Provider value={true}>
      <SWRConfig
        value={{
          provider: () => cache,
          suspense: true,
          fallback: {},
        }}
      >
        {children}
      </SWRConfig>
    </PrepassContext.Provider>
  );
}
