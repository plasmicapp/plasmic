import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
import { Html } from "@react-email/html";
import { Img } from "@react-email/img";
import { Container } from "@react-email/container";
import { Section } from "@react-email/section";
import { Text } from "@react-email/text";
import { Button } from "@react-email/button";

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: "sXtbscNmYYd622LCGixggx",
      token:
        "2jJNxm7K7mF5PpiTspuXaZeG81xVk1tC5ppPg3kNJdCiT3ddUi2u4VL9VHUiMY96XL5GQt8XMPsTd5xDxBTQ",
    },
  ],

  // By default Plasmic will use the last published version of your project.
  // For development, you can set preview to true, which will use the unpublished
  // project, allowing you to see your designs without publishing.  Please
  // only use this for development, as this is significantly slower.
  preview: true,
});

// You can register any code components that you want to use here; see
// https://docs.plasmic.app/learn/code-components-ref/
// And configure your Plasmic project to use the host url pointing at
// the /plasmic-host page of your nextjs app (for example,
// http://localhost:3000/plasmic-host).  See
// https://docs.plasmic.app/learn/app-hosting/#set-a-plasmic-project-to-use-your-app-host

// PLASMIC.registerComponent(...);
PLASMIC.registerComponent(Html, {
  name: "EmailHtml",
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "component",
        name: "EmailSection",
      },
    },
    lang: {
      type: "string",
      advanced: true,
    },
    dir: {
      type: "string",
      advanced: true,
    },
  },
  defaultStyles: {
    width: "full-bleed",
  },
});

PLASMIC.registerComponent(Section, {
  name: "EmailSection",
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "component",
        name: "EmailContainer",
      },
    },
  },
});

PLASMIC.registerComponent(Container, {
  name: "EmailContainer",
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "component",
        name: "EmailText",
      },
    },
  },
});

PLASMIC.registerComponent(Text, {
  name: "EmailText",
  props: {
    style: "object",
    children: {
      type: "slot",
      mergeWithParent: true,
      defaultValue: {
        type: "text",
        value: "Hello world!",
      },
    } as any,
  },
});

PLASMIC.registerComponent(Button, {
  name: "EmailButton",
  props: {
    children: {
      type: "slot",
      mergeWithParent: true,
      defaultValue: {
        type: "text",
        value: "Click me",
        styles: {
          color: "#0B5366",
          fontWeight: "600",
        },
      },
    } as any,
    href: {
      type: "string",
      displayName: "Link",
    },
    pX: {
      displayName: "pX",
      type: "number",
      defaultValue: 16,
    },
    pY: {
      displayName: "pY",
      type: "number",
      defaultValue: 8,
    },
    lang: {
      type: "string",
      advanced: true,
    },
    dir: {
      type: "string",
      advanced: true,
    },
  },
  defaultStyles: {
    backgroundColor: "#EEF8FF",
    borderRadius: "8px",
  },
});

PLASMIC.registerComponent(Img, {
  name: "EmailImg",
  props: {
    src: { type: "string", defaultValue: "https://picsum.photos/300/200" },
    alt: "string",
    width: "number",
    height: "number",
  },
});
