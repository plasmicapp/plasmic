import {
  EmailButton,
  EmailColumn,
  EmailContainer,
  EmailHeading,
  EmailHr,
  EmailImage,
  EmailLink,
  EmailMarkdown,
  EmailRow,
  EmailSection,
  EmailText,
} from "@/wab/server/emails/components";
import { PlasmicCanvasHost } from "@plasmicapp/host";
import registerComponent from "@plasmicapp/host/registerComponent";
import type { LinkProps } from "@react-email/components";
import React from "react";
import { createRoot } from "react-dom/client";

function makeComponentName(name: string) {
  return `plasmic-email-${name}`;
}

const componentNames = {
  button: makeComponentName("button"),
  text: makeComponentName("text"),
  image: makeComponentName("image"),
  heading: makeComponentName("heading"),
  markdown: makeComponentName("markdown"),
  link: makeComponentName("link"),
  container: makeComponentName("container"),
  row: makeComponentName("row"),
  column: makeComponentName("column"),
  section: makeComponentName("section"),
  horizontalRule: makeComponentName("hr"),
};

const IMPORT_PATH = "@/wab/server/emails/components.tsx";

registerComponent(EmailContainer, {
  name: componentNames.container,
  displayName: "Email Container",
  importPath: IMPORT_PATH,
  importName: "EmailContainer",
  styleSections: false,
  props: {
    style: {
      type: "object",
    },
    children: {
      type: "slot",
      allowedComponents: Object.values(componentNames),
      allowRootWrapper: true,
    },
  },
});

registerComponent(EmailButton, {
  name: componentNames.button,
  displayName: "Email Button",
  importPath: IMPORT_PATH,
  importName: "EmailButton",
  styleSections: false,
  props: {
    href: {
      type: "string",
      description: "Link to be triggered when the button is clicked",
      required: true,
    },
    target: {
      type: "choice",
      options: ["_blank", "_self"],
      defaultValueHint: "_blank",
      description: "Specifies where to open the linked document",
    },
    style: {
      type: "object",
    },
    children: {
      type: "string",
      displayName: "Content",
    },
  },
});
registerComponent(EmailText, {
  name: componentNames.text,
  displayName: "Email Text",
  importPath: IMPORT_PATH,
  importName: "EmailText",
  styleSections: false,
  props: {
    style: {
      type: "object",
    },
    children: {
      type: "string",
      displayName: "Content",
    },
  },
});

registerComponent(EmailImage, {
  name: componentNames.image,
  displayName: "Email Image",
  importPath: IMPORT_PATH,
  importName: "EmailImage",
  styleSections: false,
  props: {
    src: {
      type: "imageUrl",
      required: true,
      description: "The path to the image",
    },
    alt: {
      type: "string",
      description: "Alternate description for an image",
    },
    width: {
      type: "string",
      description: "The width of an image in pixels",
    },
    height: {
      type: "string",
      description: "The height of an image in pixels",
    },
  },
});

registerComponent(EmailHr, {
  name: componentNames.horizontalRule,
  displayName: "Email Horizontal Rule",
  importPath: IMPORT_PATH,
  importName: "EmailHr",
  styleSections: false,
  props: {
    style: {
      type: "object",
    },
  },
});

registerComponent(EmailLink, {
  name: componentNames.link,
  displayName: "Email Link",
  importPath: IMPORT_PATH,
  importName: "EmailLink",
  styleSections: false,
  props: {
    style: {
      type: "object",
    },
    href: {
      type: "string",
      required: true,
      description: "Link to be triggered when clicked",
    },
    target: {
      type: "choice",
      options: ["_blank", "_self"],
      defaultValueHint: "_blank",
      description: "Specify the target attribute for the link",
    },
    type: {
      type: "choice",
      options: ["text", "image"],
    },
    text: {
      hidden: (props: LinkProps) => props.type !== "text",
      type: "string",
    },
    image: {
      hidden: (props: LinkProps) => props.type !== "image",
      type: "slot",
      allowedComponents: [componentNames.image],
      allowRootWrapper: true,
    },
  },
});

registerComponent(EmailMarkdown, {
  name: componentNames.markdown,
  displayName: "Email Markdown",
  importPath: IMPORT_PATH,
  importName: "EmailMarkdown",
  styleSections: false,
  props: {
    children: {
      type: "string",
      description:
        "Contains the markdown content that will be rendered in the email template",
    },
    markdownContainerStyles: {
      type: "object",
      defaultValueHint: {},
      description:
        "Provide custom styles for the containing div that wraps the markdown content",
    },
    markdownCustomStyles: {
      type: "object",
      defaultValueHint: {},
      description:
        "Provide custom styles for the corresponding html element (p, h1, h2, etc.)",
    },
  },
});

registerComponent(EmailHeading, {
  name: componentNames.heading,
  displayName: "Email Heading",
  importPath: IMPORT_PATH,
  importName: "EmailHeading",
  styleSections: false,
  props: {
    as: {
      type: "choice",
      options: ["h1", "h2", "h3", "h4", "h5", "h6"],
      defaultValueHint: "h1",
      description: "Render component as h1, h2, h3, h4, h5 or h6",
    },
    children: {
      type: "string",
      displayName: "Content",
    },
    style: {
      type: "object",
    },
  },
});

registerComponent(EmailRow, {
  name: componentNames.row,
  displayName: "Email Row",
  importPath: IMPORT_PATH,
  importName: "EmailRow",
  styleSections: false,
  props: {
    style: {
      type: "object",
    },
    children: {
      type: "slot",
      // allowedComponents: Object.values(componentNames), // TODO: Uncomment after PLA-12156
      allowRootWrapper: true,
      description: "Content to be displayed in the row",
    },
  },
});

registerComponent(EmailColumn, {
  name: componentNames.column,
  displayName: "Email Column",
  importPath: IMPORT_PATH,
  importName: "EmailColumn",
  styleSections: false,
  props: {
    style: {
      type: "object",
    },
    align: {
      type: "choice",
      options: ["left", "center", "right"],
      defaultValueHint: "left",
      description: "Align the content of the column",
    },
    valign: {
      type: "choice",
      options: ["top", "middle", "bottom"],
      defaultValueHint: "middle",
      description: "Align the content of the column vertically",
    },
    children: {
      type: "slot",
      allowedComponents: Object.values(componentNames),
      allowRootWrapper: true,
      description: "Content to be displayed in the column",
    },
  },
});

registerComponent(EmailSection, {
  name: componentNames.section,
  displayName: "Email Section",
  importPath: IMPORT_PATH,
  importName: "EmailSection",
  styleSections: false,
  props: {
    style: {
      type: "object",
    },
    children: {
      type: "slot",
      allowedComponents: Object.values(componentNames),
      allowRootWrapper: true,
      description: "Content to be displayed in the section",
    },
  },
});

createRoot(document.getElementById("root")!).render(<PlasmicCanvasHost />);
