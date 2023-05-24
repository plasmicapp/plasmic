import { PlasmicTranslator } from "@plasmicapp/loader-nextjs";
import { useIntl } from "react-intl";
import React from "react";

/**
 * Returns a PlasmicTranslator that uses `useIntl()` to look up translation
 * strings.
 */
export function usePlasmicTranslator() {
  const intl = useIntl();
  const translator: PlasmicTranslator = (key, opts) => {
    return intl.formatMessage(
      { id: key },
      // For rich text tag substitutions like "Hello <n0>you</n0>!", intl.formatMessage
      // expects a map from nag name to a function that takes in enclosed string and returns
      // the element to render.
      opts?.components &&
        Object.fromEntries(
          Object.entries(opts.components).map(([tag, elt]) => [
            tag,
            (chunks) =>
              React.cloneElement(elt as any, { children: chunks }) as any,
          ])
        )
    );
  };
  return translator;
}
