import { useMemo, useSyncExternalStore } from "react";

function readBrowserQueryParams(search: string) {
  const searchParams = new URLSearchParams(search);
  const query: Record<string, string | string[] | undefined> = {};
  searchParams.forEach((value, key) => {
    const existing = query[key];
    if (existing === undefined) {
      query[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      query[key] = [existing, value];
    }
  });
  return query;
}

const LOCATION_CHANGE_EVENT = "plasmic:locationchange";
const HISTORY_PATCHED_KEY = "__plasmicHistoryPatched";

function ensureHistoryChangeEvents() {
  const history = window.history as History & {
    [HISTORY_PATCHED_KEY]?: boolean;
  };
  if (history[HISTORY_PATCHED_KEY]) {
    return;
  }
  history[HISTORY_PATCHED_KEY] = true;

  const pushState = history.pushState;
  const replaceState = history.replaceState;
  history.pushState = function (...args) {
    const result = pushState.apply(this, args);
    window.dispatchEvent(new Event(LOCATION_CHANGE_EVENT));
    return result;
  };
  history.replaceState = function (...args) {
    const result = replaceState.apply(this, args);
    window.dispatchEvent(new Event(LOCATION_CHANGE_EVENT));
    return result;
  };
}

export function useBrowserQueryParams() {
  const search = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") {
        return () => {};
      }
      ensureHistoryChangeEvents();
      window.addEventListener("popstate", onStoreChange);
      window.addEventListener(LOCATION_CHANGE_EVENT, onStoreChange);
      return () => {
        window.removeEventListener("popstate", onStoreChange);
        window.removeEventListener(LOCATION_CHANGE_EVENT, onStoreChange);
      };
    },
    () => (typeof window === "undefined" ? undefined : window.location.search),
    () => undefined
  );

  return useMemo(() => {
    if (search === undefined) {
      return undefined;
    }
    return readBrowserQueryParams(search);
  }, [search]);
}
