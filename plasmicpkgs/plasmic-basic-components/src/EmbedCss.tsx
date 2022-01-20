import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React from "react";

export interface EmbedCssProps {
  css: string;
}

export default function EmbedCss({
  css
}: EmbedCssProps) {
  return (
    <style
      dangerouslySetInnerHTML={{ __html: css }}
    />
  );
}

export const embedCssMeta: ComponentMeta<EmbedCssProps> = { 
  name: "hostless-embed-css",
  displayName: "EmbedCss",
  importName: "EmbedCss",
  importPath: "@plasmicpkgs/plasmic-basic-components",
  props: {
    css: {
      type: "string",
      defaultValueHint: "Some CSS snippet",
      description: "CSS rules to be inserted",
    },
  },
};

export function registerEmbedCss(
  loader?: { registerComponent: typeof registerComponent },
  customEmbedCssMeta?: ComponentMeta<EmbedCssProps>
) {
  if (loader) {
    loader.registerComponent(EmbedCss, customEmbedCssMeta ?? embedCssMeta);
  } else {
    registerComponent(EmbedCss, customEmbedCssMeta ?? embedCssMeta);
  }
}
