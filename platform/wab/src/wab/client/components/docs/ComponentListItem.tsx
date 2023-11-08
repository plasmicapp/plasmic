import { observer } from "mobx-react-lite";
import * as React from "react";
import { Component } from "../../../classes";
import { asOne } from "../../../common";
import { toClassName } from "../../../shared/codegen/util";
import { U } from "../../cli-routes";
import { PlasmicComponentListItem } from "../../plasmic/plasmic_kit_docs_portal/PlasmicComponentListItem";
import { PublicLink } from "../PublicLink";
import { DocsPortalCtx } from "./DocsPortalCtx";

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
