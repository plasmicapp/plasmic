import * as React from "react";
import { Site } from "../../../classes";
import { toVarName } from "../../../shared/codegen/util";
import { PlumeDocsProp } from "../../../shared/plume/plume-registry";
import {
  DefaultDocsPropsTableRowProps,
  PlasmicDocsPropsTableRow,
  PlasmicDocsPropsTableRow__OverridesType,
} from "../../plasmic/plasmic_kit_docs_portal/PlasmicDocsPropsTableRow";

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
