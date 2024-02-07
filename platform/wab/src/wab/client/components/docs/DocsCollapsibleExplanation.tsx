import {
  DefaultDocsCollapsibleExplanationProps,
  PlasmicDocsCollapsibleExplanation,
} from "@/wab/client/plasmic/plasmic_kit_docs_portal/PlasmicDocsCollapsibleExplanation";
import L from "lodash";
import * as React from "react";

interface DocsCollapsibleExplanationProps
  extends Omit<DefaultDocsCollapsibleExplanationProps, "children"> {
  children?: React.ReactNode | ((expanded: boolean) => React.ReactNode);
  defaultExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
}

function DocsCollapsibleExplanation(props: DocsCollapsibleExplanationProps) {
  const { children, defaultExpanded, onToggle, ...rest } = props;
  const [isExpanded, setExpanded] = React.useState(defaultExpanded ?? false);
  return (
    <PlasmicDocsCollapsibleExplanation
      isExpanded={isExpanded}
      children={L.isFunction(children) ? children(isExpanded) : children}
      iconButton={{
        onClick: (e) => {
          setExpanded(!isExpanded);
          onToggle && onToggle(!isExpanded);
          e.stopPropagation();
        },
      }}
      root={{
        onClick: () => {
          if (!isExpanded) {
            setExpanded(!isExpanded);
            onToggle && onToggle(!isExpanded);
          }
        },
      }}
      {...rest}
    />
  );
}

export default DocsCollapsibleExplanation;
