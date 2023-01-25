import { initPlasmicLoader } from "@plasmicapp/loader-nextjs/react-server-conditional";

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: "47tFXWjN2C4NyHFGGpaYQ3",
      token: "7BRFratDxPLMGZHnd2grV5QP6mlHcZ1AK3BJSIeh7xzUlHgWh25XpgXvUaKAqHXFMXQQuzpADqboibF6nqNWQ",
    },
  ],

  // By default Plasmic will use the last published version of your project.
  // For development, you can set preview to true, which will use the unpublished
  // project, allowing you to see your designs without publishing.  Please
  // only use this for development, as this is significantly slower.
  preview: false,
});
