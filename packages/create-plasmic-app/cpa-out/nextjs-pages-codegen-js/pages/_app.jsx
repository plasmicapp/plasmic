import "../components/plasmic/create_plasmic_app/plasmic.css"; // plasmic-import: 47tFXWjN2C4NyHFGGpaYQ3/projectcss
import '@/styles/globals.css'
import { PlasmicRootProvider } from "@plasmicapp/react-web";
import Head from "next/head";
import Link from "next/link";

export default function MyApp({ Component, pageProps }) {
  return (
    <PlasmicRootProvider Head={Head} Link={Link}>
      <Component {...pageProps} />
    </PlasmicRootProvider>
  );
}
