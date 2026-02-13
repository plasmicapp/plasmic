import {
  ComponentRenderData,
  PlasmicComponent,
  PlasmicRootProvider,
} from "@plasmicapp/loader-nextjs";
import { PLASMIC } from "../init";

// Statically fetch the data needed to render Plasmic pages or components.
export const getStaticProps = async () => {
  // You can pass in multiple page paths or component names.
  const plasmicData = await PLASMIC.fetchComponentData(
    "Footer",
    "PriceTier",
    "Testimonials"
  );
  return {
    props: {
      plasmicData,
    },
  };
};

// Render the page or component from Plasmic.
export default function FooterPage(props: {
  plasmicData: ComponentRenderData;
}) {
  return (
    <PlasmicRootProvider loader={PLASMIC} prefetchedData={props.plasmicData}>
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
