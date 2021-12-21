import React from 'react';

export interface DataCacheEntry<T> {
  promise?: Promise<T>;
  data?: T;
  error?: Error;
}

interface PlasmicDataContextValue {
  cache: Record<string, DataCacheEntry<any>>;
  suspense?: boolean;
}

// Use a default cache, in case PlasmicDataContext.Provider
// isn't in the tree. Usually PlasmicRootProvider will provide this,
// so this is most likely in the canvas.
const PlasmicDataContext = React.createContext<PlasmicDataContextValue>({
  cache: {},
  suspense: false,
});

function useForceUpdate() {
  const [_, setState] = React.useState({});
  const mountedRef = React.useRef(false);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const callback = React.useCallback(() => {
    if (mountedRef.current) {
      setState({});
    }
  }, [setState, mountedRef]);
  return callback;
}

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
export function usePlasmicQueryData<T>(key: string, fetcher: () => Promise<T>) {
  const prepassCtx = React.useContext(PrepassContext);
  const dataCtx = React.useContext(PlasmicDataContext)!;
  const forceUpdate = useForceUpdate();

  // If we're doing prepass, then we want to make sure that we are writing
  // to the prepass cache and not the DataContext cache. We're making a cache
  // explicitly for prepass so that if there are intervening PlasmicDataContext
  // in the tree, we don't miss out on those cache writes.  The data we collect
  // here will eventually be passed to initialize the cache in PlasmicDataContext
  // when we do the real rendering.
  const cache = prepassCtx?.cache ?? dataCtx?.cache;

  // If we're doing prepass, then we are always in suspense mode, because
  // react-ssr-prepass only works with suspense-throwing data fetching.
  const suspense = !!prepassCtx || dataCtx?.suspense;

  if (key in cache) {
    const { promise, data, error } = cache[key];
    if (data) {
      return { data: data as T };
    } else if (error) {
      if (suspense) {
        throw error;
      } else {
        return { error };
      }
    } else if (promise) {
      if (suspense) {
        throw promise;
      } else {
        promise.then(forceUpdate);
        return {};
      }
    }
  }

  const promise = fetcher().then((data) => {
    cache[key].data = data;
    if (!suspense) {
      forceUpdate();
    }
    return data;
  }).catch((err) => {
    cache[key].error = err;
    if (!suspense) {
      forceUpdate();
    }
    throw err;
  });
  cache[key] = {
    promise,
  };

  if (suspense) {
    throw promise;
  }

  return {};
}

export function PlasmicQueryDataProvider(props: {
  suspense?: boolean;
  children: React.ReactNode;
  prefetchedCache?: Record<string, any>;
}) {
  const { children, suspense, prefetchedCache } = props;
  const [cache] = React.useState<Record<string, DataCacheEntry<any>>>(
    prefetchedCache
      ? Object.fromEntries(
          Object.entries(prefetchedCache).map(([key, val]) => [
            key,
            { data: val },
          ])
        )
      : {}
  );
  const value = React.useMemo(() => ({ cache, suspense }), [cache, suspense]);
  return (
    <PlasmicDataContext.Provider value={value}>
      {children}
    </PlasmicDataContext.Provider>
  );
}

interface PrepassContextValue {
  cache: Record<string, DataCacheEntry<any>>;
}
export const PrepassContext = React.createContext<
  PrepassContextValue | undefined
>(undefined);
