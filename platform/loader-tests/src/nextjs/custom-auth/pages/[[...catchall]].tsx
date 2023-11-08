import { PlasmicUser } from "@plasmicapp/auth-api";
import {
  ComponentRenderData,
  extractPlasmicQueryData,
  PlasmicComponent,
  PlasmicRootProvider,
} from "@plasmicapp/loader-nextjs";
import { GetServerSideProps } from "next";
import Error from "next/error";
import { useRouter } from "next/router";
import { getPlasmicAppUserFromConfig } from "../auth-utils";
import { PLASMIC } from "../init";

const DATA_HOST = undefined; // __DATA_HOST__

// @ts-ignore
globalThis["__PLASMIC_DATA_HOST"] = DATA_HOST ?? "http://localhost:3003";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { catchall } = context.params ?? {};

  const userEmail = context.query.userEmail as string;

  const plasmicPath =
    typeof catchall === "string"
      ? catchall
      : Array.isArray(catchall)
      ? `/${catchall.join("/")}`
      : "/";
  const plasmicData = await PLASMIC.maybeFetchComponentData(plasmicPath);
  if (!plasmicData) {
    // This is some non-Plasmic catch-all page
    return {
      props: {},
    };
  }

  // This is a path that Plasmic knows about.
  const pageMeta = plasmicData.entryCompMetas[0];
  const { plasmicUser, plasmicUserToken } = await getPlasmicAppUserFromConfig(
    userEmail
  );

  // Cache the necessary data fetched for the page.
  const queryCache = await extractPlasmicQueryData(
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={plasmicData}
      pageParams={pageMeta.params}
      user={plasmicUser}
      userAuthToken={plasmicUserToken}
    >
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicRootProvider>
  );

  // Pass the data in as props.
  return {
    props: { plasmicData, queryCache, plasmicUser, plasmicUserToken },
  };
};

/**
 * Actually render the page!
 */
export default function CatchallPage(props: {
  plasmicData?: ComponentRenderData;
  queryCache?: Record<string, any>;
  plasmicUser?: PlasmicUser;
  plasmicUserToken?: string;
}) {
  const { plasmicData, queryCache, plasmicUser, plasmicUserToken } = props;
  const router = useRouter();
  if (!plasmicData || plasmicData.entryCompMetas.length === 0) {
    return <Error statusCode={404} />;
  }
  const pageMeta = plasmicData.entryCompMetas[0];
  return (
    // Pass in the data fetched in getStaticProps as prefetchedData
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
