import * as React from "react";
import ReactDOM from "react-dom";
import { isBrowser, useIsomorphicLayoutEffect } from "../react-utils";

type Queries = { [name: string]: string };

const listeners: Array<() => void> = [];
const queries: Queries = {};

function matchScreenVariants() {
  if (!isBrowser) {
    return [];
  }
  return Object.entries(queries)
    .filter(([, query]) => window.matchMedia(query).matches)
    .map(([name]) => name);
}

// undefined if screen variants have never been calculated
let curScreenVariants: string[] | undefined = undefined;

function recalculateScreenVariants() {
  const screenVariant = matchScreenVariants();
  if (
    !curScreenVariants ||
    screenVariant.join("") !== curScreenVariants.join("")
  ) {
    curScreenVariants = screenVariant;
    ReactDOM.unstable_batchedUpdates(() =>
      listeners.forEach((listener) => listener())
    );
  }
}

function ensureInitCurScreenVariants() {
  // Initializes curScreenVariants if it hadn't been before. Note that this must
  // be called from within an effect.
  if (curScreenVariants === undefined) {
    curScreenVariants = matchScreenVariants();
  }
}

if (isBrowser) {
  window.addEventListener("resize", recalculateScreenVariants);
}

export function createUseScreenVariants(
  isMulti: boolean,
  screenQueries: Queries
) {
  Object.assign(queries, screenQueries);

  return function () {
    // It is important that upon first render, we return [] or undefined, because
    // that is what SSR will use, and the client must match.  In an effect (which
    // only happens on the client), we then actually ask for the real screen variant
    // and, if different from [] or undefined, forces a re-render.

    const [, updateState] = React.useState<{}>();
    const lastScreenVariantsRef = React.useRef<string[]>(
      curScreenVariants || []
    );

    // We do useLayoutEffect instead of useEffect to immediately
    // register our forceUpdate. This ensures that if there was
    // a window resize event between render and effects, that the
    // listener will be registered in time
    useIsomorphicLayoutEffect(() => {
      const updateIfChanged = () => {
        if (
          curScreenVariants &&
          lastScreenVariantsRef.current.join("") !== curScreenVariants.join("")
        ) {
          lastScreenVariantsRef.current = curScreenVariants;
          // Force update
          updateState({});
        }
      };

      // Listeners are invoked whenever the window is resized
      listeners.push(updateIfChanged);

      // Initialize the curScreenVariants for the first time.  We don't need
      // to invoke the listeners here because all components will already
      // have this effect running and will re-render if the real screen
      // variant is non-empty.
      ensureInitCurScreenVariants();

      // Now, if the curScreenVariants differs from what we returned last,
      // then force a re-render.
      updateIfChanged();
      return () => {
        // Remove our listener on unmount
        listeners.splice(listeners.indexOf(updateIfChanged), 1);
      };
    }, []);

    if (isMulti) {
      return curScreenVariants || [];
    } else if (curScreenVariants) {
      return curScreenVariants[curScreenVariants.length - 1];
    } else {
      return undefined;
    }
  };
}
