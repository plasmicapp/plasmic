import * as React from "react";
import {
  DefaultDocsPropsTableProps,
  PlasmicDocsPropsTable,
} from "../../plasmic/plasmic_kit_docs_portal/PlasmicDocsPropsTable";

interface DocsPropsTableProps extends DefaultDocsPropsTableProps {}

function DocsPropsTable(props: DocsPropsTableProps) {
  return <PlasmicDocsPropsTable {...props} />;
}

export default DocsPropsTable;
