import * as React from "react";
import {
  PlasmicComponent,
  extractPlasmicQueryData,
  ComponentRenderData,
  PlasmicRootProvider,
} from "@plasmicapp/loader-nextjs";
import type { GetStaticPaths, GetStaticProps } from "next";
import "@supabase/auth-helpers-nextjs";
import useSWR from "swr";

import Error from "next/error";
import { useRouter } from "next/router";
import { PLASMIC } from "@/plasmic-init";
import { PLASMIC_AUTH_DATA_KEY } from "../utils/cache-keys";

export default function PlasmicLoaderPage(props: {
  plasmicData?: ComponentRenderData;
  queryCache?: Record<string, any>;
}) {
  const { plasmicData, queryCache } = props;
  const router = useRouter();
  const { isUserLoading, plasmicUserToken, plasmicUser } = usePlasmicAuthData();
  if (!plasmicData || plasmicData.entryCompMetas.length === 0) {
    return <Error statusCode={404} />;
  }
  const pageMeta = plasmicData.entryCompMetas[0];
  return (
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={plasmicData}
      prefetchedQueryData={queryCache}
      pageParams={pageMeta.params}
      pageQuery={router.query}
      isUserLoading={isUserLoading}
      user={plasmicUser}
      userAuthToken={plasmicUserToken}
    >
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicRootProvider>
  );
}

/**
 * Send a request from client to server to get the user and auth token.
 * This is going to use the user current session to get a valid plasmic user.
 */
function usePlasmicAuthData() {
  const { isLoading, data } = useSWR(PLASMIC_AUTH_DATA_KEY, async () => {
    const data = await fetch("/api/plasmic-auth").then((r) => r.json());
    return data;
  });
  return {
    isUserLoading: isLoading,
    plasmicUser: data?.plasmicUser,
    plasmicUserToken: data?.plasmicUserToken,
  };
}

export const getStaticProps: GetStaticProps = async (context) => {
  const { catchall } = context.params ?? {};
  const plasmicPath = typeof catchall === 'string' ? catchall : Array.isArray(catchall) ? `/${catchall.join('/')}` : '/';
  const plasmicData = await PLASMIC.maybeFetchComponentData(plasmicPath);
  if (!plasmicData) {
    // non-Plasmic catch-all
    return { props: {} };
  }
  const pageMeta = plasmicData.entryCompMetas[0];
  // Cache the necessary data fetched for the page
  const queryCache = await extractPlasmicQueryData(
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={plasmicData}
      pageParams={pageMeta.params}
    >
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicRootProvider>
  );
  // Use revalidate if you want incremental static regeneration
  return { props: { plasmicData, queryCache }, revalidate: 60 };
}

export const getStaticPaths: GetStaticPaths = async () => {
  const pageModules = await PLASMIC.fetchPages();
  return {
    paths: pageModules.map((mod) => ({
      params: {
        catchall: mod.path.substring(1).split("/"),
      },
    })),
    fallback: "blocking",
  };
}
