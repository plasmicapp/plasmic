import {
  initPlasmicLoader,
  PlasmicComponent,
  PlasmicRootProvider,
} from "@plasmicapp/loader-react";

const LOADER = initPlasmicLoader({
  projects: [
    {
      id: "jzrCyUTP1h82GbByDRVb1L",
      token:
        "YF9LaKBauPomd2UMk0M3JMJ2gDWRejTV8N50kYUv9pECVFPUZdelJgYdxE45aenJMZNe4rvbBb73RqbtwmsQ",
    },
  ],
});

export function App() {
  return (
    <PlasmicRootProvider loader={LOADER}>
      <PlasmicComponent
        component="Homepage"
        componentProps={{ title: "Minimal Preact app" }}
      />
    </PlasmicRootProvider>
  );
}
