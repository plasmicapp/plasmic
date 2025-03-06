import { UserMentionDisplay } from "@/wab/client/components/user-mentions/UserMentionDisplay";
import React, { ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function StandardMarkdown(props: ComponentProps<typeof ReactMarkdown>) {
  const processedChildren =
    typeof props.children === "string"
      ? processUserMentions(props.children)
      : props.children;

  function processUserMentions(content: string) {
    // Remove the leading @ from the mention @email
    const mentionRegex = /@(\S+@\S+\.\S+)/gm;
    return content.replace(mentionRegex, (_match, email) => {
      return email;
    });
  }

  return (
    <ReactMarkdown
      linkTarget={"_blank"}
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children, ...restProps }) => {
          const defaultLinkNode = (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              {...restProps}
            >
              {children}
            </a>
          );

          const isEmailLink = href?.startsWith("mailto:");
          if (isEmailLink) {
            const email = href!.replace("mailto:", "");
            return (
              <UserMentionDisplay
                email={email}
                defaultEmailDisplay={defaultLinkNode}
              />
            );
          }

          return defaultLinkNode;
        },
      }}
      {...props}
      children={processedChildren}
    />
  );
}
