import {
  ComponentRenderData,
  InitOptions,
  PlasmicComponent,
  PlasmicRootProvider,
} from "@plasmicapp/loader-gatsby";
import { graphql, PageProps } from "gatsby";
import React from "react";
import { initPlasmic } from "../init";

// Statically fetch the data needed to render Plasmic pages or components.
// You can pass in multiple page paths or component names.
export const query = graphql`
  query {
    plasmicComponents(componentNames: ["Footer", "PriceTier", "Testimonials"])
    plasmicOptions
  }
`;

// Render the page or component from Plasmic.
export default function MyPage({
  data,
}: PageProps<{
  plasmicComponents: ComponentRenderData;
  plasmicOptions: InitOptions;
}>) {
  const { plasmicComponents, plasmicOptions } = data;
  return (
    <PlasmicRootProvider
      loader={initPlasmic(plasmicOptions)}
      prefetchedData={plasmicComponents}
    >
      <style>{`
        body {
          margin: 0;
        }
      `}</style>
      <h2>Fake Footer</h2>
      <PlasmicComponent component={"Footer"} />
      <h2>Fake PriceTier</h2>
      <PlasmicComponent
        component={"PriceTier"}
        componentProps={{
          title: "Fake Tier",
          price: "$100",
          valueProps: (
            <div>
              I am so <strong>VERY COOL</strong>
            </div>
          ),
          children: <em>Do it now!!!</em>,
        }}
      />
      <h2>Fake testimonials</h2>
      <PlasmicComponent component="Testimonials" />
    </PlasmicRootProvider>
  );
}
