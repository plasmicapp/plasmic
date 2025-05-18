import { initPlasmicLoader } from "@plasmicapp/loader-nextjs/react-server-conditional";
import * as NextNavigation from "next/navigation";

const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;
const projectToken = process.env.NEXT_PUBLIC_PROJECT_TOKEN;

if (!projectId || !projectToken) {
  throw new Error("Please set PROJECT_ID and PROJECT_TOKEN in .env");
}

export const PLASMIC = initPlasmicLoader({
  nextNavigation: NextNavigation,
  projects: [
    {
      id: projectId,
      token: projectToken,
    },
  ],

  // By default Plasmic will use the last published version of your project.
  // For development, you can set preview to true, which will use the unpublished
  // project, allowing you to see your designs without publishing.  Please
  // only use this for development, as this is significantly slower.
  preview: true,
});
