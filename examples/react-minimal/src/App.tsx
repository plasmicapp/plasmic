import {
  initPlasmicLoader,
  PlasmicCanvasHost,
  PlasmicRootProvider,
} from "@plasmicapp/loader-react";
import * as React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Homepage } from "./Homepage";

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
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/plasmic-host" element={<PlasmicCanvasHost />} />
        </Routes>
      </BrowserRouter>
    </PlasmicRootProvider>
  );
}
