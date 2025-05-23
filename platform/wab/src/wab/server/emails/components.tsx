import {
  Button,
  Column,
  Container,
  Heading,
  Hr,
  Img,
  Link,
  type LinkProps,
  Markdown,
  Row,
  Section,
  Text,
} from "@react-email/components";
import React from "react";

const COMMON_STYLES = {
  boxSizing: "border-box",
};

function applyCommonStyles({ style, ...rest }: any) {
  console.log("sarah style", {
    ...(style ?? {}),
    ...COMMON_STYLES,
  });
  return {
    style: {
      ...(style ?? {}),
      ...COMMON_STYLES,
    },
    ...rest,
  };
}

function withCommonStyles<P extends object>(Component: React.ComponentType<P>) {
  return (props: P) => <Component {...applyCommonStyles(props)} />;
}

export const EmailButton = withCommonStyles(Button);
export const EmailContainer = withCommonStyles(Container);
export const EmailText = withCommonStyles(Text);
export const EmailImage = withCommonStyles(Img);
export const EmailHr = withCommonStyles(Hr);
export const EmailMarkdown = withCommonStyles(Markdown);
export const EmailHeading = withCommonStyles(Heading);
export const EmailRow = withCommonStyles(Row);
export const EmailColumn = withCommonStyles(Column);
export const EmailSection = withCommonStyles(Section);

export const EmailLink = (
  props: LinkProps & {
    type: "text" | "image";
    text?: string;
    image?: React.ReactNode;
  }
) => {
  const children = props.type === "image" ? props.image : props.text;
  // eslint-disable-next-line react/forbid-elements
  return <Link {...applyCommonStyles(props)}>{children}</Link>;
};
