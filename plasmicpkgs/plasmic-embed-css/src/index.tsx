import registerGlobalContext, {
  GlobalContextMeta,
} from "@plasmicapp/host/registerGlobalContext";
import React from "react";

export interface EmbedCssProps {
  css: string;
}

export function EmbedCss({
  css,
  children,
}: React.PropsWithChildren<EmbedCssProps>) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} /> {children}
    </>
  );
}

export const embedCssMeta: GlobalContextMeta<EmbedCssProps> = {
  name: "global-embed-css",
  displayName: "Embed Css",
  importName: "EmbedCss",
  importPath: "@plasmicpkgs/plasmic-embed-css",
  props: {
    css: {
      type: "code",
      lang: "css",
      defaultValueHint: "/* CSS snippet */",
      description: "CSS rules to be inserted",
    },
  },
};

export function registerEmbedCss(
  loader?: { registerGlobalContext: typeof registerGlobalContext },
  customEmbedCssMeta?: GlobalContextMeta<EmbedCssProps>
) {
  if (loader) {
    loader.registerGlobalContext(EmbedCss, customEmbedCssMeta ?? embedCssMeta);
  } else {
    registerGlobalContext(EmbedCss, customEmbedCssMeta ?? embedCssMeta);
  }
}
