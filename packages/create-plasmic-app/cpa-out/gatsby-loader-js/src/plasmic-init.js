import {
  initPlasmicLoader,
} from "@plasmicapp/loader-gatsby";

export function initPlasmicLoaderWithRegistrations(plasmicOptions) {
  const PLASMIC = initPlasmicLoader(plasmicOptions);

  // You can register any code components that you want to use here; see
  // https://docs.plasmic.app/learn/code-components-ref/
  // And configure your Plasmic project to use the host url pointing at
  // the /plasmic-host page of your nextjs app (for example,
  // http://localhost:8000/plasmic-host).  See
  // https://docs.plasmic.app/learn/app-hosting/#set-a-plasmic-project-to-use-your-app-host

  // PLASMIC.registerComponent(...);

  return PLASMIC;
}
