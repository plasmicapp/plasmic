import * as React from "react";
import {
  PlasmicComponent,
  extractPlasmicQueryData,
  ComponentRenderData,
  PlasmicRootProvider,
} from "@plasmicapp/loader-nextjs";
import type { GetServerSideProps } from "next";
import "@supabase/auth-helpers-nextjs"

import Error from "next/error";
import { useRouter } from "next/router";
import { PLASMIC } from "@/plasmic-init";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import { getPlasmicAuthData } from "../../utils/plasmic-auth";
import { PlasmicUser } from "@plasmicapp/auth-api";

export default function PlasmicLoaderPage(props: {
  plasmicData?: ComponentRenderData;
  queryCache?: Record<string, any>;
  plasmicUser?: PlasmicUser,
  plasmicUserToken?: string,
}) {
  const { plasmicData, queryCache, plasmicUser, plasmicUserToken } = props;
  const router = useRouter();
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
      user={plasmicUser}
      userAuthToken={plasmicUserToken}
    >
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicRootProvider>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const plasmicData = await PLASMIC.maybeFetchComponentData("SSR");
  if (!plasmicData) {
    // non-Plasmic catch-all
    return { props: {} };
  }

  // Fetch the user and auth token while on the server
  const supabaseServerClient = createPagesServerClient(context);
  const { plasmicUser, plasmicUserToken } = await getPlasmicAuthData(
    supabaseServerClient
  );

  const pageMeta = plasmicData.entryCompMetas[0];
  // Cache the necessary data fetched for the page
  const queryCache = await extractPlasmicQueryData(
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={plasmicData}
      pageParams={pageMeta.params}
      // Pass the user object and auth token to cache user fetched data
      user={plasmicUser}
      userAuthToken={plasmicUserToken}
    >
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicRootProvider>
  );

  return {
    props: {
      plasmicData,
      queryCache,
      plasmicUser,
      plasmicUserToken,
    },
  };
}