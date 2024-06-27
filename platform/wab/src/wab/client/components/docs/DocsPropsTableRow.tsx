import {
  DefaultDocsPropsTableRowProps,
  PlasmicDocsPropsTableRow,
  PlasmicDocsPropsTableRow__OverridesType,
} from "@/wab/client/plasmic/plasmic_kit_docs_portal/PlasmicDocsPropsTableRow";
import { toVarName } from "@/wab/shared/codegen/util";
import { Site } from "@/wab/shared/model/classes";
import { PlumeDocsProp } from "@/wab/shared/plume/plume-registry";
import * as React from "react";

interface DocsPropsTableRowProps
  extends DefaultDocsPropsTableRowProps,
    PlasmicDocsPropsTableRow__OverridesType {
  prop: PlumeDocsProp;
  site: Site;
}

function DocsPropsTableRow(props: DocsPropsTableRowProps) {
  const { prop, site, ...rest } = props;
  return (
    <PlasmicDocsPropsTableRow
      {...rest}
      propName={toVarName(prop.name)}
      description={prop.info}
      propType={typeof prop.type === "string" ? prop.type : prop.type(site)}
    />
  );
}

export default DocsPropsTableRow;
