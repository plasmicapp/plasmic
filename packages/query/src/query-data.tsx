import React, { PropsWithChildren } from "react";
import useSWR, {
  Cache,
  Fetcher,
  Key,
  SWRConfig,
  SWRConfiguration,
  SWRResponse,
  useSWRConfig,
} from "swr";

export type { SWRResponse } from "swr";

let __SWRConfig: ReturnType<typeof useSWRConfig> | undefined = undefined;
export const mutateKeys = (invalidateKey?: string) => {
  if (__SWRConfig) {
    const { cache, mutate } = __SWRConfig;
    (invalidateKey != null
      ? [invalidateKey]
      : Array.from((cache as Map<string, any>).keys())
    ).forEach((key) => {
      mutate(key);
    });
  }
};

// @plasmicapp/query is optimized for SSR, so we do not revalidate
// automatically upon hydration; as if the data is immutable.
function getPlasmicDefaultSWROptions(opts?: {
  isMutable?: boolean;
}): SWRConfiguration {
  return {
    revalidateIfStale: !!opts?.isMutable,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  };
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
export function usePlasmicQueryData<T>(
  key: Key,
  fetcher: Fetcher<T>
): { data?: T; error?: Error; isLoading?: boolean } {
  const prepassCtx = React.useContext(PrepassContext);

  const opts = getPlasmicDefaultSWROptions();
  if (prepassCtx) {
    // If we're doing prepass, then we are always in suspense mode, because
    // react-ssr-prepass only works with suspense-throwing data fetching.
    opts.suspense = true;
  }

  const config = useSWRConfig();
  React.useEffect(() => {
    __SWRConfig = config;
  }, [config]);

  const wrappedFetcher = React.useMemo(
    () => wrapLoadingFetcher(fetcher),
    [fetcher]
  );

  const resp = useSWR(key, wrappedFetcher, opts);
  if (resp.data !== undefined) {
    return { data: resp.data };
  } else if (resp.error) {
    return { error: resp.error };
  } else {
    return { isLoading: true };
  }
}

/**
 * Fetches data asynchronously using SWR Hook (https://swr.vercel.app/)
 *
 * @param key a unique key for this data fetch; if data already exists under this
 *   key, that data is returned immediately.
 * @param fetcher an async function that resolves to the fetched data.
 * @param options (optional) an object of options for this hook (https://swr.vercel.app/docs/options).
 * @returns an object with either a "data" key with the fetched data if the fetch
 *   was successful, or an "error" key with the thrown Error if the fetch failed.
 */
export function useMutablePlasmicQueryData<T, E>(
  key: Key,
  fetcher: Fetcher<T>,
  options?: SWRConfiguration<T, E>
): SWRResponse<T, E> & { isLoading?: boolean; isLagging?: boolean } {
  const prepassCtx = React.useContext(PrepassContext);

  const opts = {
    ...getPlasmicDefaultSWROptions({ isMutable: true }),
    ...options,
  };
  if (prepassCtx) {
    opts.suspense = true;
  }

  const config = useSWRConfig();
  React.useEffect(() => {
    __SWRConfig = config;
  }, [config]);

  const [isLoading, setIsLoading] = React.useState(false);
  const fetcherWrapper = React.useCallback(
    async (...args: any[]) => {
      setIsLoading(true);
      try {
        return await wrapLoadingFetcher(fetcher)(...args);
      } finally {
        setIsLoading(false);
      }
    },
    [fetcher]
  );

  // Based on https://swr.vercel.app/docs/middleware#keep-previous-result
  const laggyDataRef = React.useRef<any>();

  const { isValidating, mutate, data, error } = useSWR(
    key,
    fetcherWrapper,
    opts
  );

  React.useEffect(() => {
    if (data !== undefined) {
      laggyDataRef.current = data;
    }
  }, [data]);

  return React.useMemo(
    () => ({
      isValidating,
      mutate,
      isLoading: (data === undefined && error === undefined) || isLoading,
      ...(data !== undefined
        ? { data }
        : error === undefined && laggyDataRef.current
        ? // Show previous data if available
          { data: laggyDataRef.current, isLagging: true }
        : {}),
      ...(error !== undefined ? { error } : {}),
    }),
    [isValidating, mutate, data, error, isLoading]
  );
}

export function PlasmicQueryDataProvider(props: {
  children: React.ReactNode;
  suspense?: boolean;
  prefetchedCache?: Record<string, any>;
  provider?: () => Cache;
}) {
  const { children, suspense, prefetchedCache, provider } = props;
  const prepass = React.useContext(PrepassContext);
  if (prepass) {
    // If we're in prepass, then there's already a wrappign SWRConfig;
    // don't interfere with it.
    return <>{children}</>;
  } else {
    return (
      <SWRConfig
        value={{
          fallback: prefetchedCache ?? {},
          suspense,
          provider,
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

export const usePlasmicDataConfig: typeof useSWRConfig = useSWRConfig;

let loadingCount = 0;
export type LoadingStateListener = (isLoading: boolean) => void;
const listeners: LoadingStateListener[] = [];

/**
 * Subscribes to whether any loading is happening via @plasmicapp/query.
 * Returns a function to unsubscribe.
 */
export function addLoadingStateListener(
  listener: LoadingStateListener,
  opts?: { immediate?: boolean }
) {
  listeners.push(listener);
  if (opts?.immediate) {
    listener(loadingCount > 0);
  }
  return () => {
    listeners.splice(listeners.indexOf(listener), 1);
  };
}

/**
 * Instruments an async function to increment and decrement the number of
 * simultaneous async loads. You can then subscribe to whether there
 * are any loads happening via addLoadingStateListener().
 */
export function wrapLoadingFetcher<
  T extends (...args: any[]) => Promise<any> | any
>(fetcher: T): T {
  return (async (...args: any) => {
    if (loadingCount === 0) {
      listeners.forEach((listener) => listener(true));
    }
    loadingCount += 1;
    try {
      const res = fetcher(...args);
      return isPromiseLike(res) ? await res : res;
    } finally {
      loadingCount -= 1;
      if (loadingCount === 0) {
        listeners.forEach((listener) => listener(false));
      }
    }
  }) as T;
}

function isPromiseLike(x: any) {
  return (
    !!x && typeof x === "object" && "then" in x && typeof x.then === "function"
  );
}

export function isPlasmicPrepass() {
  return !!(React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
    ?.ReactCurrentDispatcher?.current?.isPlasmicPrepass;
}

export type HeadMetadata = {
  title?: string;
  description?: string;
  image?: string;
  canonical?: string;
};

export const HeadMetadataContext = React.createContext<HeadMetadata>({});
