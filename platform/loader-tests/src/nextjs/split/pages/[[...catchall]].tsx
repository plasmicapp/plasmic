import {
  ComponentRenderData,
  PlasmicComponent,
  PlasmicRootProvider,
} from "@plasmicapp/loader-nextjs";
import {
  generateAllPaths,
  getActiveVariation,
  rewriteWithoutTraits,
} from "@plasmicapp/loader-nextjs/edge";
import { GetStaticPaths, GetStaticProps } from "next";
import Error from "next/error";
import { PLASMIC } from "../init";

export const getStaticPaths: GetStaticPaths = async () => {
  const pages = await PLASMIC.fetchPages();
  const splits = PLASMIC.getActiveSplits();
  function* gen() {
    for (const page of pages) {
      const allPaths = generateAllPaths(page.path);
      for (const path of allPaths) {
        yield {
          params: {
            catchall: path.substring(1).split("/"),
          },
        };
      }
    }
  }
  return {
    paths: Array.from(gen()),
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps = async (context) => {
  const { catchall } = context.params ?? {};
  const rawPlasmicPath =
    typeof catchall === "string"
      ? catchall
      : Array.isArray(catchall)
      ? `/${catchall.join("/")}`
      : "/";
  const { path: plasmicPath, traits } = rewriteWithoutTraits(rawPlasmicPath);
  const plasmicData = await PLASMIC.maybeFetchComponentData(plasmicPath);
  const variation = getActiveVariation({
    splits: PLASMIC.getActiveSplits(),
    traits,
    path: plasmicPath,
  });
  if (plasmicData) {
    // This is a path that Plasmic knows about; pass the data
    // in as props
    return {
      props: { plasmicData, variation },
    };
  } else {
    // This is some non-Plasmic catch-all page
    return {
      props: {},
    };
  }
};

export default function CatchallPage(props: {
  plasmicData?: ComponentRenderData;
  variation?: Record<string, string>;
}) {
  const { plasmicData, variation } = props;
  if (!plasmicData || plasmicData.entryCompMetas.length === 0) {
    return <Error statusCode={404} />;
  }
  return (
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={plasmicData}
      variation={variation}
    >
      <PlasmicComponent component={plasmicData.entryCompMetas[0].name} />
    </PlasmicRootProvider>
  );
}
