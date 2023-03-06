import { PLASMIC } from "@/plasmic-init";
import {
  ComponentRenderData,
  extractPlasmicQueryData,
  PlasmicComponent,
  PlasmicRootProvider,
  usePlasmicQueryData,
} from "@plasmicapp/loader-nextjs";
import { GetStaticProps } from "next";

const ipUrl = "https://worldtimeapi.org/api/ip";
const timezoneUrl = "https://worldtimeapi.org/api/timezone";

export default function DynamicPage({
  prefetchedData,
  prefetchedQueryData,
}: {
  prefetchedData?: ComponentRenderData;
  prefetchedQueryData?: Record<string, unknown>;
}) {
  return (
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={prefetchedData}
      prefetchedQueryData={prefetchedQueryData}
    >
      <PlasmicComponent
        component="Layout"
        componentProps={{
          content: <Content />,
        }}
      />
    </PlasmicRootProvider>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prefetchedData = await PLASMIC.fetchComponentData(
    "Layout",
    "Card",
    "Card: SSR",
    "Card: SSG"
  );
  const prefetchedQueryData = await extractPlasmicQueryData(
    <DynamicPage prefetchedData={prefetchedData} />
  );
  return { props: { prefetchedData, prefetchedQueryData }, revalidate: 10 };
};

function Content() {
  // 1. Fetch timezone from IP
  const { data: timezone } = usePlasmicQueryData("ip", async () => {
    const resp = await fetch(ipUrl);
    const data = await resp.json();
    return data["timezone"];
  });

  // 2. Fetch time from timezone
  const { data: time } = usePlasmicQueryData(
    timezone ? timezoneUrl : null,
    async () => {
      const resp = await fetch(`${timezoneUrl}/${timezone}`);
      const data = await resp.json();
      return data["datetime"];
    }
  );

  return (
    <>
      <PlasmicComponent
        component="Card"
        componentProps={{
          title: "Write your own code",
          children: "This page was built like any other page in Next.js.",
        }}
      />
      <PlasmicComponent
        component="Card"
        componentProps={{
          title: "Use Plasmic components",
          children:
            "This page references components built in Plasmic Studio, so designs are always in sync.",
        }}
      />
      <PlasmicComponent
        component="Card"
        componentProps={{
          title: "Fetch data dynamically",
          children: (
            <span>
              For example, your timezone ({timezone}) and local time ({time})
              were fetched server-side from https://worldtimeapi.org/ based on
              your IP.
            </span>
          ),
        }}
      />
      <PlasmicComponent component="Card: SSR" />
      <PlasmicComponent component="Card: SSG" />
      <PlasmicComponent
        component="Card"
        componentProps={{
          title: "Incremental static regeneration (ISR)",
          children:
            "On a production build, this page (including the dynamic data) will be regenerated every 10 seconds.",
        }}
      />
    </>
  );
}
