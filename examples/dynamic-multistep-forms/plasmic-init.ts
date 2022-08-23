import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
import {
  FormAction,
  FormContainer,
  FormItem,
  FormStep,
  RadioInput,
} from "./components/Forms";

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: "235aWciVosZstZCfWGvZW3",
      token:
        "jmK93hiQ0kuCa51daQ8dNpCKhL2qvFSjy0JZmFZ2qtjwdxeaBdxX4ZeOceMgZHEWRGCk80QM8pznuzDsjQ",
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

PLASMIC.registerComponent(FormContainer, {
  name: "FormContainer",
  props: {
    previewStep: {
      type: "number",
      description: "Switch to a specific form step",
    },
    previewAll: {
      type: "boolean",
      description: "Show all form steps for easier editing",
      defaultValue: true,
    },
    children: {
      type: "slot",
      defaultValue: {
        type: "component",
        name: "FormStep",
      },
    },
  },
  defaultStyles: {
    width: "stretch",
    padding: "8px",
  },
});

PLASMIC.registerComponent(FormStep, {
  name: "FormStep",
  providesData: true,
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "vbox",
        children: [
          {
            type: "component",
            name: "FormItem",
          },
          {
            type: "component",
            name: "FormItem",
            props: {
              name: "anotherQuestion",
            },
          },
          {
            type: "default-component",
            kind: "button",
            props: {
              children: {
                type: "text",
                value: "Submit",
              },
            },
          },
        ],
      },
    },
  },
  defaultStyles: {
    padding: "8px",
  },
});

PLASMIC.registerComponent(FormItem, {
  name: "FormItem",
  props: {
    name: {
      type: "string",
      defaultValue: "someQuestion",
      description: "The question name this radio group controls",
    },
    required: {
      type: "boolean",
      description: "Is this field required before advancing",
    },
    revealName: {
      type: "string",
      displayName: "Reveal when",
      defaultValueHint: "questionName",
      description:
        "Conditionally reveal this FormItem when the question of this name is equal to the given value",
    },
    revealValue: {
      type: "string",
      displayName: "Is equal to",
      defaultValueHint: "questionAnswer",
      description:
        "Conditionally reveal this FormItem when the question response is equal to this value",
    },
    children: {
      type: "slot",
      defaultValue: {
        type: "vbox",
        children: [
          {
            type: "text",
            value: "What make is your car?",
          },
          {
            type: "component",
            name: "RadioInput",
            props: {
              value: "alpha",
              children: { type: "text", value: "Choice alpha" },
            },
          },
          {
            type: "component",
            name: "RadioInput",
            props: {
              value: "beta",
              children: { type: "text", value: "Choice beta" },
            },
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

PLASMIC.registerComponent(RadioInput, {
  name: "RadioInput",
  props: {
    value: {
      type: "string",
      description: "The answer value selecting this choice sets",
    },
    children: {
      type: "slot",
      defaultValue: "Label for this radio input choice",
    },
  },
  defaultStyles: {
    display: "flex",
    padding: "8px",
  },
});

PLASMIC.registerComponent(FormAction, {
  name: "FormAction",
  isAttachment: true,
  props: {
    action: {
      type: "choice",
      options: ["prev", "next"],
    },
    children: {
      type: "slot",
      defaultValue: {
        type: "button",
        value: "Previous",
      },
    },
  },
});
