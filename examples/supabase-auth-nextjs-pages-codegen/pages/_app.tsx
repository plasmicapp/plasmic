import { PlasmicRootProvider } from "@plasmicapp/react-web";
import type { AppProps } from "next/app";
import Head from "next/head";
import { usePlasmicAuthData } from "../utils/usePlasmicAuth";

function PlasmicRootProviderWithUser(props: { children: React.ReactNode }) {
  const { isUserLoading, plasmicUser, plasmicUserToken } = usePlasmicAuthData();
  return (
    <PlasmicRootProvider
      Head={Head}
      isUserLoading={isUserLoading}
      user={plasmicUser}
      userAuthToken={plasmicUserToken}
    >
      {props.children}
    </PlasmicRootProvider>
  );
}

export default function MyApp({ Component, pageProps }: AppProps) {
  if (pageProps.withoutUseAuth) {
    return (
      <PlasmicRootProvider Head={Head}>
        <Component {...pageProps} />
      </PlasmicRootProvider>
    );
  }
  return (
    <PlasmicRootProviderWithUser>
      <Component {...pageProps} />
    </PlasmicRootProviderWithUser>
  );
}
