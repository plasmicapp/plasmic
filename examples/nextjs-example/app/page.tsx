import { PLASMIC } from "@/plasmic-init";
import { ClientPlasmicRootProvider } from "@/plasmic-init-client";
import "@/styles/globals.css";
import { PlasmicComponent } from "@plasmicapp/loader-nextjs";

export default async function Homepage() {
  return (
    <ClientPlasmicRootProvider
      prefetchedData={await PLASMIC.fetchComponentData(
        "Layout",
        "Card",
        "Card: SSR",
        "Card: SSG"
      )}
    >
      <PlasmicComponent
        component="Layout"
        componentProps={{
          content: (
            <div>
              <p>
                <a href="/pages">pages/ directory example</a> (works for all
                Next.js versions)
              </p>
              <p>
                <a href="/app">app/ directory example</a> (new Next.js 13
                feature)
              </p>
            </div>
          ),
        }}
      />
    </ClientPlasmicRootProvider>
  );
}
