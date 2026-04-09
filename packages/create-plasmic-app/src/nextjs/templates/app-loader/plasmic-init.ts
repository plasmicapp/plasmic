export function makePlasmicInit_app_loader(
  projectId: string,
  projectApiToken: string
): string {
  return `import { initPlasmicLoader } from "@plasmicapp/loader-nextjs/react-server-conditional";

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: "${projectId}",
      token: "${projectApiToken}",
    },
  ],
  platformOptions: {
    nextjs: {
      appDir: true,
    },
  },

  // By default Plasmic will use the last published version of your project.
  // For development, you can set preview to true, which will use the unpublished
  // project, allowing you to see your designs without publishing.  Please
  // only use this for development, as this is significantly slower.
  preview: false,
});

// Register custom functions here so they are available during SSR.
// See https://docs.plasmic.app/learn/registering-custom-functions/
//
// IMPORTANT for app-router projects: any custom function used by a server
// query must be registered here, which runs on the server.  Registrations in
// plasmic-init-client.tsx are only available in the browser and will cause
// a runtime error if referenced by a server query during SSR.
//
// PLASMIC.registerFunction(...);
`;
}
