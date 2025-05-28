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
import registerComponent, {
  StyleSection,
} from "@plasmicapp/host/registerComponent";
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

const COMPONENTS_IMPORT_PATH = "@/wab/server/emails/components.tsx";
const STYLE_SECTIONS: StyleSection[] = ["visibility"]; // set to false after PLA-12167

registerComponent(EmailContainer, {
  name: componentNames.container,
  displayName: "Email Container",
  importPath: COMPONENTS_IMPORT_PATH,
  importName: "EmailContainer",
  styleSections: STYLE_SECTIONS,
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
  importPath: COMPONENTS_IMPORT_PATH,
  importName: "EmailButton",
  styleSections: STYLE_SECTIONS,
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
  importPath: COMPONENTS_IMPORT_PATH,
  importName: "EmailText",
  styleSections: STYLE_SECTIONS,
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
  importPath: COMPONENTS_IMPORT_PATH,
  importName: "EmailImage",
  styleSections: STYLE_SECTIONS,
  props: {
    style: {
      type: "object",
    },
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
  importPath: COMPONENTS_IMPORT_PATH,
  importName: "EmailHr",
  styleSections: STYLE_SECTIONS,
  props: {
    style: {
      type: "object",
    },
  },
});

registerComponent(EmailLink, {
  name: componentNames.link,
  displayName: "Email Link",
  importPath: COMPONENTS_IMPORT_PATH,
  importName: "EmailLink",
  styleSections: STYLE_SECTIONS,
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
  importPath: COMPONENTS_IMPORT_PATH,
  importName: "EmailMarkdown",
  styleSections: STYLE_SECTIONS,
  props: {
    children: {
      displayName: "Content",
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
  importPath: COMPONENTS_IMPORT_PATH,
  importName: "EmailHeading",
  styleSections: STYLE_SECTIONS,
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
  importPath: COMPONENTS_IMPORT_PATH,
  importName: "EmailRow",
  styleSections: STYLE_SECTIONS,
  props: {
    style: {
      type: "object",
    },
    children: {
      type: "slot",
      allowedComponents: Object.values(componentNames),
      allowRootWrapper: true,
      description: "Content to be displayed in the row",
    },
  },
});

registerComponent(EmailColumn, {
  name: componentNames.column,
  displayName: "Email Column",
  importPath: COMPONENTS_IMPORT_PATH,
  importName: "EmailColumn",
  styleSections: STYLE_SECTIONS,
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
  importPath: COMPONENTS_IMPORT_PATH,
  importName: "EmailSection",
  styleSections: STYLE_SECTIONS,
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
