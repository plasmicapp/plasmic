import '../styles/globals.css'
import { PlasmicRootProvider } from "@plasmicapp/react-web";
import Head from "next/head";

function MyApp({ Component, pageProps }) {
  return (
    <PlasmicRootProvider Head={Head}>
      <Component {...pageProps} />
    </PlasmicRootProvider>
  );
}

export default MyApp
