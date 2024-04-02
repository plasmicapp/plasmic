import {
  DefaultDocsComponentsPortalProps,
  PlasmicDocsComponentsPortal,
} from "@/wab/client/plasmic/plasmic_kit_docs_portal/PlasmicDocsComponentsPortal";
import { isPlumeComponent } from "@/wab/components";
import { observer } from "mobx-react";
import * as React from "react";
import { useDocsPortalCtx } from "./DocsPortalCtx";
import { DocsPortalEditor } from "./DocsPortalEditor";
import { DocsPreviewCanvas } from "./DocsPreviewCanvas";

type DocsComponentsPortalProps = DefaultDocsComponentsPortalProps

const DocsComponentsPortal = observer(function DocsComponentsPortal(
  props: DocsComponentsPortalProps
) {
  const docsCtx = useDocsPortalCtx();
  const component = docsCtx.tryGetFocusedComponent();
  return (
    <PlasmicDocsComponentsPortal
      {...props}
      editor={<DocsPortalEditor docsCtx={docsCtx} />}
      viewport={<DocsPreviewCanvas docsCtx={docsCtx} />}
      componentType={
        component && isPlumeComponent(component) ? "plume" : undefined
      }
      componentView={{ docsCtx }}
    />
  );
});

export default DocsComponentsPortal;
