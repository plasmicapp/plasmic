import { ResourceMentionDisplay } from "@/wab/client/components/copilot/ResourceMentionDisplay";
import { parseMention } from "@/wab/client/components/mentions/mention-parse";
import { UserMentionDisplay } from "@/wab/client/components/user-mentions/UserMentionDisplay";
import { mkModelUiId } from "@/wab/client/studio-ctx/ui/studio-ui-ids";
import { MENTION_REGEX } from "@/wab/shared/mentions";
import React, { ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Mentions are rewritten to this scheme so that Markdown parses them as
 * autolinks, which `MarkdownLink` then renders as chips.
 */
const MENTION_PREFIX = "mention:";

type MarkdownComponents = ComponentProps<typeof ReactMarkdown>["components"];

const MarkdownLink: NonNullable<MarkdownComponents>["a"] = ({
  href,
  children,
  ...restProps
}) => {
  const defaultLinkNode = (
    <a href={href} target="_blank" rel="noopener noreferrer" {...restProps}>
      {children}
    </a>
  );

  const hrefProperty = restProps.node.properties?.href?.toString() || "";

  return <MentionHref href={hrefProperty} fallback={defaultLinkNode} />;
};

const MARKDOWN_COMPONENTS = {
  a: MarkdownLink,
};

export function StandardMarkdown(props: ComponentProps<typeof ReactMarkdown>) {
  const processedChildren =
    typeof props.children === "string"
      ? processMentions(props.children)
      : props.children;

  return (
    <ReactMarkdown
      linkTarget={"_blank"}
      remarkPlugins={[remarkGfm]}
      components={MARKDOWN_COMPONENTS}
      className="markdown-body"
      {...props}
      children={processedChildren}
    />
  );
}

function MentionHref({
  href,
  fallback,
}: {
  href: string;
  fallback: React.ReactNode;
}) {
  const ref = href.startsWith(MENTION_PREFIX)
    ? parseMention(href.slice(MENTION_PREFIX.length))
    : undefined;
  switch (ref?.type) {
    case "SiteScoped":
    case "ComponentScoped":
      return <ResourceMentionDisplay uiId={mkModelUiId(ref)} />;
    case "user":
      return (
        <UserMentionDisplay email={ref.email} defaultEmailDisplay={fallback} />
      );
    default:
      return <>{fallback}</>;
  }
}

/** Leaves a mention naming nothing as the text the author typed. */
function processMentions(content: string): string {
  return content.replace(MENTION_REGEX, (mention, raw) =>
    parseMention(raw) ? `<${MENTION_PREFIX}${raw}>` : mention,
  );
}
