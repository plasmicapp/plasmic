import { U } from "@/wab/client/cli-routes";
import { PublicLink } from "@/wab/client/components/PublicLink";
import { DocsPortalCtx } from "@/wab/client/components/docs/DocsPortalCtx";
import { PlasmicComponentListItem } from "@/wab/client/plasmic/plasmic_kit_docs_portal/PlasmicComponentListItem";
import { asOne } from "@/wab/shared/common";
import { toClassName } from "@/wab/shared/codegen/util";
import { Component } from "@/wab/shared/model/classes";
import { observer } from "mobx-react";
import * as React from "react";

interface ComponentListItemProps {
  docsCtx: DocsPortalCtx;
  component: Component;
}

const ComponentListItem = observer(function ComponentListItem(
  props: ComponentListItemProps
) {
  const { component, docsCtx } = props;
  const url = U.projectDocsComponent({
    projectId: docsCtx.studioCtx.siteInfo.id,
    componentIdOrClassName: toClassName(component.name) || component.uuid,
    codegenType: docsCtx.getCodegenType(),
  });
  return (
    <PlasmicComponentListItem
      isSelected={docsCtx.tryGetFocusedComponent() === component}
      root={{
        render: ({ children, ...rest }) => {
          return (
            <PublicLink
              {...(rest as any)}
              children={asOne(children)}
              href={url}
            />
          );
        },
      }}
    >
      {component.name}
    </PlasmicComponentListItem>
  );
});

export default ComponentListItem;
