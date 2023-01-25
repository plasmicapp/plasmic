import { i18n } from "@lingui/core";
import { Trans } from "@lingui/react";
import { PlasmicTranslator } from "@plasmicapp/loader-nextjs";

export const PLASMIC_TRANSLATOR: PlasmicTranslator = (key, opts) => {
  if (opts?.components) {
    return <Trans id={key} components={opts.components} />;
  } else {
    return i18n._(key);
  }
};
