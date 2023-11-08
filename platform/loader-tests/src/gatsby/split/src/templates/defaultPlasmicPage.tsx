import {
  ComponentRenderData,
  InitOptions,
  PlasmicComponent,
  PlasmicRootProvider,
} from "@plasmicapp/loader-gatsby";
import { GetServerDataProps, graphql, PageProps } from "gatsby";
import React from "react";
import config from "../../config.json";
import { initPlasmic } from "../init";

export const query = graphql`
  query ($path: String) {
    plasmicComponents(componentNames: [$path])
    plasmicOptions
  }
`;

export async function getServerData(ctx: GetServerDataProps) {
  const cookies = (ctx.headers.get("cookie") as string) ?? "";
  const knownValues = Object.fromEntries(
    cookies
      .split("; ")
      .filter((cookie) => cookie.includes("plasmic:"))
      .map((cookie) => cookie.split("="))
      .map((_ref) => {
        const key = _ref[0],
          value = _ref[1];
        return [key.split(":")[1], value];
      })
  );
  const PLASMIC = initPlasmic(config);
  const variation = await PLASMIC.getActiveVariation({
    traits: {},
    known: knownValues,
  });
  return {
    props: {
      variation,
    },
  };
}

const PlasmicGatsbyPage = ({
  location,
  data,
  serverData,
}: PageProps<
  {
    plasmicComponents: ComponentRenderData;
    plasmicOptions: InitOptions;
  },
  object,
  object,
  {
    variation: Record<string, string>;
  }
>) => {
  const { plasmicComponents, plasmicOptions } = data;
  const { variation } = serverData;
  return (
    <PlasmicRootProvider
      loader={initPlasmic(plasmicOptions)}
      prefetchedData={plasmicComponents}
      variation={variation}
    >
      <PlasmicComponent component={location.pathname} />
    </PlasmicRootProvider>
  );
};

export default PlasmicGatsbyPage;
