import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
import { ShowHideAction, ShowHideContent } from "./components/ShowHide";

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

PLASMIC.registerComponent(ShowHideAction, {
  name: "ShowHideAction",
  displayName: "Show/Hide Action",
  isAttachment: true,
  props: {
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
      } as const,
    },
  },
  defaultStyles: {
    width: "hug",
  },
});

PLASMIC.registerComponent(ShowHideContent, {
  name: "ShowHideContent",
  displayName: "Show/Hide Content",
  isAttachment: true,
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "vbox",
        children: {
          type: "text",
          value: "This is some content you can toggle visibility on",
        },
      },
    },
  },
});
