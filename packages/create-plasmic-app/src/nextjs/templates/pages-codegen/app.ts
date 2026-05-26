import { ifTs } from "../../../utils/file-utils";
import { JsOrTs, PlasmicCssImport } from "../../../utils/types";

export function makeCustomApp_pages_codegen(
  jsOrTs: JsOrTs,
  cssImports: PlasmicCssImport[] = []
): string {
  const plasmicCssImportLines = cssImports
    .map(
      (i) =>
        `import "${i.importPath}"; // plasmic-import: ${i.projectId}/projectcss`
    )
    .join("\n");
  const plasmicCssImportsBlock = plasmicCssImportLines
    ? `${plasmicCssImportLines}\n`
    : "";

  return `${plasmicCssImportsBlock}import '@/styles/globals.css'
import { PlasmicRootProvider } from "@plasmicapp/react-web";${ifTs(
    jsOrTs,
    `
import type { AppProps } from "next/app";`
  )}
import Head from "next/head";
import Link from "next/link";

export default function MyApp({ Component, pageProps }${ifTs(
    jsOrTs,
    `: AppProps`
  )}) {
  return (
    <PlasmicRootProvider Head={Head} Link={Link}>
      <Component {...pageProps} />
    </PlasmicRootProvider>
  );
}
`;
}
