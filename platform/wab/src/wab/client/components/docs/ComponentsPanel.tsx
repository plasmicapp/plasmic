import ComponentListItem from "@/wab/client/components/docs/ComponentListItem";
import { useDocsPortalCtx } from "@/wab/client/components/docs/DocsPortalCtx";
import { Matcher } from "@/wab/client/components/view-common";
import {
  DefaultComponentsPanelProps,
  PlasmicComponentsPanel,
} from "@/wab/client/plasmic/plasmic_kit_docs_portal/PlasmicComponentsPanel";
import {
  isCodeComponent,
  isFrameComponent,
  isSubComponent,
} from "@/wab/components";
import { Alert } from "antd";
import { observer } from "mobx-react";
import * as React from "react";

type ComponentsPanelProps = DefaultComponentsPanelProps;

const ComponentsPanel = observer(function ComponentsPanel(
  props: ComponentsPanelProps
) {
  const docsCtx = useDocsPortalCtx();
  const [query, setQuery] = React.useState("");
  const matcher = new Matcher(query);
  const components = docsCtx.studioCtx.site.components.filter(
    (c) =>
      !isFrameComponent(c) &&
      !isCodeComponent(c) &&
      !isSubComponent(c) &&
      matcher.matches(c.name)
  );

  return (
    <PlasmicComponentsPanel
      {...props}
      searchbox={{
        value: query,
        onChange: (e) => setQuery(e.target.value),
        autoFocus: true,
      }}
    >
      <>
        {components.map((comp) => (
          <ComponentListItem
            key={comp.uid}
            component={comp}
            docsCtx={docsCtx}
          />
        ))}

        {components.length === 0 && (
          <Alert
            className="m-m"
            style={{ width: "100%" }}
            type="warning"
            showIcon
            message="No components."
          />
        )}
      </>
    </PlasmicComponentsPanel>
  );
});

export default ComponentsPanel;
