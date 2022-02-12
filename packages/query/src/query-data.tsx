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
  // when we do the real rendering
  const cache = prepassCtx?.cache ?? dataCtx?.cache;

  // If we're doing prepass, then we are always in suspense mode, because
  // react-ssr-prepass only works with suspense-throwing data fetching.
  const suspense = !!prepassCtx || dataCtx?.suspense;

  React.useEffect(
    () => {
      // If we're using suspense, we don't fetch in effect
      if (suspense) {
        return;
      }

      // Otherwise, we need to kick off the fetch in effect,
      // and force a re-render once we get the result.
      const promise = fetcher()
        .then((data) => {
          cache[key].data = data;
          forceUpdate();
        })
        .catch((err) => {
          cache[key].error = err;
          forceUpdate();
        });
      cache[key] = { promise };
    },
    // Intentionally leaving `fetcher()` out of here; makes it possibly incorrect,
    // but most of the time users will not be passing in fetchers that do different things.
    [key, suspense, cache, forceUpdate]
  );

  if (key in cache) {
    // We've fetched for this key before! Just return what we can
    const entry = cache[key];
    if ('data' in entry) {
      return { data: entry.data as T };
    } else if ('error' in entry) {
      if (suspense) {
        // For suspense, we throw the fetch error to the error boundary
        throw entry.error;
      } else {
        // For non-suspense, we return the fetch error
        return { error: entry.error };
      }
    } else if (entry.promise) {
      // Fetching is still happening!
      if (suspense) {
        // For suspense, we throw the promise as usual
        throw entry.promise;
      } else {
        // For non-suspense, we return the empty object to indicate loading
        // is in progress.
        return {};
      }
    }
  }

  if (suspense) {
    // For Suspense, if no entry yet, we start the fetch, create a promise,
    // cache it, and throw the promise
    const promise = fetcher()
      .then((data) => {
        cache[key].data = data;
      })
      .catch((err) => {
        cache[key].error = err;
      });
    cache[key] = { promise };
    throw promise;
  } else {
    // Otherwise, we return empty object, signaling loading
    return {};
  }
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
