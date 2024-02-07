import {
  DefaultDocsPropsTableProps,
  PlasmicDocsPropsTable,
} from "@/wab/client/plasmic/plasmic_kit_docs_portal/PlasmicDocsPropsTable";
import * as React from "react";

interface DocsPropsTableProps extends DefaultDocsPropsTableProps {}

function DocsPropsTable(props: DocsPropsTableProps) {
  return <PlasmicDocsPropsTable {...props} />;
}

export default DocsPropsTable;
