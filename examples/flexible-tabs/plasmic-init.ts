import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
import { TabButton, TabsContainer, TabUnderline } from "./components/Tabs";

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: "xje8ae2i8KrAmXAXFih4mp",
      token:
        "fwmzfdKnxJmYF8eU9E65lQMqu16GzMKCEC5KnKpQbj6mNW3EcExklpYoNgzKBdpxXZyVlHhE9kwTIrHru81g",
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

PLASMIC.registerComponent(TabsContainer, {
  name: "TabsContainer",
  providesData: true,
  props: {
    initialKey: {
      type: "string",
      description: "Key of the initially selected tab",
    },
    previewKey: {
      type: "string",
      description: "Show this key while editing",
    },
    children: {
      type: "slot",
      defaultValue: {
        type: "vbox",
        children: [
          {
            type: "hbox",
            children: [
              {
                type: "component",
                name: "TabButton",
              },
              {
                type: "component",
                name: "TabButton",
              },
              {
                type: "component",
                name: "TabUnderline",
              },
            ],
          },
          {
            type: "text",
            value:
              "You can insert tab contents here and update them based on dynamic values.",
          },
        ],
      },
    },
  },
  defaultStyles: {
    width: "stretch",
    padding: "8px",
  },
});

PLASMIC.registerComponent(TabUnderline, {
  name: "TabUnderline",
  props: {
    children: {
      type: "slot",
    },
  },
  defaultStyles: {
    background: "#7777ff",
    height: "2px",
  },
});

PLASMIC.registerComponent(TabButton, {
  name: "TabButton",
  isAttachment: true,
  props: {
    tabKey: {
      type: "string",
      description: "The answer value selecting this choice sets",
    },
    children: {
      type: "slot",
      defaultValue: {
        type: "default-component",
        kind: "button",
        props: {
          children: {
            type: "text",
            value: "Some tab",
          },
        },
      },
    },
  },
  defaultStyles: {
    width: "hug",
  },
});
