import React, { ComponentProps } from "react";
import ReactMarkdown from "react-markdown";

export function StandardMarkdown(props: ComponentProps<typeof ReactMarkdown>) {
  return <ReactMarkdown linkTarget={"_blank"} {...props} />;
}
