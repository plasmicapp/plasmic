import { PlasmicTranslator } from "@plasmicapp/loader-nextjs";
import { Trans, useTranslation } from "next-i18next";
import React from "react";

export function usePlasmicTranslator() {
  const { t } = useTranslation();
  const translator: PlasmicTranslator = (key, opts) => {
    if (opts?.components) {
      return (
        <Trans
          i18nKey={key}
          components={opts.components as Record<string, React.ReactElement>}
        />
      );
    } else {
      return t(key);
    }
  };
  return translator;
}
