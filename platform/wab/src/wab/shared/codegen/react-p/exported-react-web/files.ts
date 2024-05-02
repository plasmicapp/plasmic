import { ProjectConfig } from "@/wab/shared/codegen/types";

/**
This is a subset of code from:
- packages/react-web/src/render/elements.ts
- packages/react-web/src/render/global-variants.ts
- packages/react-web/src/styles/plasmic.css

@plasmicapp/react-web is still used in the exported code
but this additional files are added to the project, so that
it's possible to achieve functional screen variants without
@plasmicapp/react-web dependency.
*/
export const reactWebExportedFiles: ProjectConfig["reactWebExportedFiles"] = [
  {
    fileName: "global-variants.ts",
    content: `
interface Variants {
  [vg: string]: any;
}

export function hasVariant<V extends Variants>(
  variants: V | undefined,
  groupName: keyof V,
  variant: string
) {
  if (variants == null) {
    return false;
  }
  const groupVariants = variants[groupName];
  if (groupVariants == null) {
    return false;
  } else if (groupVariants === true) {
    return variant === groupName;
  } else if (groupVariants === false) {
    return false;
  } else if (Array.isArray(groupVariants)) {
    return groupVariants.includes(variant);
  } else if (typeof groupVariants === "string") {
    return groupVariants === variant;
  } else {
    return (
      groupVariants[variant] !== undefined && groupVariants[variant] !== false
    );
  }
}

const isDefaultValue = (val: string) => val === "PLEASE_RENDER_INSIDE_PROVIDER";
const seenDefaultVariants: Record<string, boolean> = {};
export function ensureGlobalVariants<T extends Record<string, any>>(
  globalVariantValues: T
) {
  Object.entries(globalVariantValues)
    .filter(([_, value]) => isDefaultValue(value))
    .forEach(([key, _]) => {
      (globalVariantValues as any)[key] = undefined;

      if (!seenDefaultVariants[key] && process.env.NODE_ENV === "development") {
        seenDefaultVariants[key] = true;
        const providerName = \`\${key[0].toUpperCase()}\${key.substring(
          1
        )}Context.Provider\`;
        console.warn(
          \`Plasmic context value for global variant "\${key}" was not provided; please use \${providerName} at the root of your React app. Learn More: https://www.plasmic.app/learn/other-assets/#global-variants\`
        );
      }
    });
  return globalVariantValues;
}
`.trim(),
  },
  {
    fileName: "react-web.css",
    content: `
:where(.__wab_flex-container),
:where(.ρfc) {
  display: flex;
  flex: 1;
  align-self: stretch;
  pointer-events: none;
}

:where(.__wab_flex-container > *),
:where(.ρfc > *) {
  pointer-events: auto;
}

:where(.__wab_slot),
:where(.ρs) {
  display: contents;
}

:where(.__wab_slot-string-wrapper),
:where(.ρsw) {
  position: relative;
}

:where(.__wab_passthrough) {
  display: contents;
}

:where(.__wab_img-wrapper) {
  position: relative;
  display: inherit;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

:where(.__wab_slot > .__wab_img-wrapper),
:where(.ρs > .__wab_img-wrapper) {
  display: block;
}

:where(.__wab_passthrough > .__wab_img-wrapper) {
  display: block;
}

:where(.__wab_img-spacer-svg) {
  display: block;
  margin: 0;
  border: none;
  padding: 0;
}

:where(.__wab_img) {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 0;
  border: none;
  display: block;
  width: 100%;
  min-width: 100%;
  max-width: 100%;
  min-height: 100%;
  max-height: 100%;
  box-sizing: border-box;
}

:where(.__wab_picture) {
  display: contents;
}
`.trim(),
  },
  {
    fileName: "screen-variants.ts",
    content: `
import React from "react";
import ReactDOM from "react-dom";

export const isBrowser = typeof window !== "undefined";
export const NONE = Symbol("NONE");

export const useIsomorphicLayoutEffect = isBrowser
  ? React.useLayoutEffect
  : React.useEffect;

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
  curScreenVariants = undefined;

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
`.trim(),
  },
];
