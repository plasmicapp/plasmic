import { initPlasmicLoader } from "@plasmicapp/loader-nextjs/react-server-conditional";

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: "961Dap539VqK6ewnrYwsre",
      token:
        "Ey2dSPAF37f6N1EP4cg4xf61nx3moqyPCidIpkWSAq2XkqcLSJcgUxEsZwCGPMG2OZm1HHii3UcxRoCLVYaQ",
    },
  ],

  // By default Plasmic will use the last published version of your project.
  // For development, you can set preview to true, which will use the unpublished
  // project, allowing you to see your designs without publishing.  Please
  // only use this for development, as this is significantly slower.
  preview: false,
});
