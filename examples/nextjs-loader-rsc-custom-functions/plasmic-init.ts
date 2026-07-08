import { initPlasmicLoader } from "@plasmicapp/loader-nextjs/react-server-conditional";
import {
  myAsyncFunction,
  myAsyncFunctionParams,
} from "./custom-functions/my-async-function";

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: "stoZP2Q25ryrSt32JthGeP",
      token:
        "0Wdo3SsS1Fz23D4ejZKYGa79WAk1SU4dkrToDilK4HHAQ8aJV5tmgv7JKgGhLOpFaDxl7HqXGY9zNiy0MZxjSA",
    },
  ],

  // By default Plasmic will use the last published version of your project.
  // For development, you can set preview to true, which will use the unpublished
  // project, allowing you to see your designs without publishing.  Please
  // only use this for development, as this is significantly slower.
  preview: false,
});

// You can register any code components that you want to use here; see
// https://docs.plasmic.app/learn/code-components-ref/
// And configure your Plasmic project to use the host url pointing at
// the /plasmic-host page of your nextjs app (for example,
// http://localhost:3000/plasmic-host).  See
// https://docs.plasmic.app/learn/app-hosting/#set-a-plasmic-project-to-use-your-app-host

// PLASMIC.registerComponent(...);

// Register custom functions here (not in plasmic-init-client.tsx) so they're
// available on the server to prefetch queries, as well as on the client.
PLASMIC.registerFunction(myAsyncFunction, myAsyncFunctionParams);
