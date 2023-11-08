import * as React from "react";
import {
  DefaultDocsImagesPortalProps,
  PlasmicDocsImagesPortal,
} from "../../plasmic/plasmic_kit_docs_portal/PlasmicDocsImagesPortal";
import { useDocsPortalCtx } from "./DocsPortalCtx";
import { DocsPortalEditor } from "./DocsPortalEditor";
import { DocsPreviewCanvas } from "./DocsPreviewCanvas";

interface DocsImagesPortalProps extends DefaultDocsImagesPortalProps {}

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
