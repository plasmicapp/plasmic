import { useDocsPortalCtx } from "@/wab/client/components/docs/DocsPortalCtx";
import { DocsPortalEditor } from "@/wab/client/components/docs/DocsPortalEditor";
import { DocsPreviewCanvas } from "@/wab/client/components/docs/DocsPreviewCanvas";
import {
  DefaultDocsImagesPortalProps,
  PlasmicDocsImagesPortal,
} from "@/wab/client/plasmic/plasmic_kit_docs_portal/PlasmicDocsImagesPortal";
import * as React from "react";

type DocsImagesPortalProps = DefaultDocsImagesPortalProps;

function DocsImagesPortal(props: DocsImagesPortalProps) {
  const docsCtx = useDocsPortalCtx();
  return (
    <PlasmicDocsImagesPortal
      {...props}
      editor={<DocsPortalEditor docsCtx={docsCtx} />}
      viewport={<DocsPreviewCanvas docsCtx={docsCtx} />}
    />
  );
}

export default DocsImagesPortal;
