import { ifTs } from "../../../utils/file-utils";
import { JsOrTs } from "../../../utils/types";

export function makeCustomApp_pages_codegen(jsOrTs: JsOrTs): string {
  return `import '@/styles/globals.css'
import { PlasmicRootProvider } from "@plasmicapp/react-web";${ifTs(
    jsOrTs,
    `
import type { AppProps } from "next/app";`
  )}
import Head from "next/head";

export default function MyApp({ Component, pageProps }${ifTs(
    jsOrTs,
    `: AppProps`
  )}) {
  return (
    <PlasmicRootProvider Head={Head}>
      <Component {...pageProps} />
    </PlasmicRootProvider>
  );
}
`;
}
