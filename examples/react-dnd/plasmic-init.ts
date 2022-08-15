/** @format */

import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
import {
  AtomicContainer,
  CustomizableContainer,
  DEFAULT_DATA,
  Field,
} from "./components/Container";

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: "48urnctFmaYjeHBp3o9yY1",
      token:
        "JYhhxVfCOcX2e1oSAeDOMMJJuIcWeV59RCRFQwew77lt3qnhL4YMGvaO67cBTr84mAwH81d3162gnybtxdw",
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

PLASMIC.registerComponent(AtomicContainer, {
  name: "AtomicContainer",
  props: {
    defaultData: {
      type: "object",
      defaultValue: DEFAULT_DATA,
    },
  },
});

PLASMIC.registerComponent(CustomizableContainer, {
  name: "CustomizableContainer",
  providesData: true,
  props: {
    defaultData: {
      type: "object",
      defaultValue: DEFAULT_DATA,
    },
    children: {
      type: "slot",
      defaultValue: {
        type: "vbox",
        children: [
          {
            type: "component",
            name: "Field",
          },
        ],
      },
    },
  },
});

PLASMIC.registerComponent(Field, {
  name: "Field",
  props: {
    field: {
      type: "string",
      defaultValue: "text",
    },
  },
});
