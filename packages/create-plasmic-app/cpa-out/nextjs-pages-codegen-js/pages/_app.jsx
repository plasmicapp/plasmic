import 'styles/globals.css'
import { PlasmicRootProvider } from "@plasmicapp/react-web";
import { AppProps } from "next/app";
import Head from "next/head";

export default function MyApp({ Component, pageProps }) {
  return (
    <PlasmicRootProvider Head={Head}>
      <Component {...pageProps} />
    </PlasmicRootProvider>
  );
}
