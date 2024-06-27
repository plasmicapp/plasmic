import { DocsPortalCtx } from "@/wab/client/components/docs/DocsPortalCtx";
import { PropValueEditor } from "@/wab/client/components/sidebar-tabs/PropValueEditor";
import { PlasmicLinkedProp } from "@/wab/client/plasmic/plasmic_kit_docs_portal/PlasmicLinkedProp";
import { wabTypeToPropType } from "@/wab/shared/code-components/code-components";
import { toVarName } from "@/wab/shared/codegen/util";
import { Param } from "@/wab/shared/model/classes";
import { wabToTsType } from "@/wab/shared/model/model-util";
import { Tooltip } from "antd";
import { observer } from "mobx-react";
import * as React from "react";

interface LinkedPropProps {
  docsCtx: DocsPortalCtx;
  param: Param;
}

const LinkedProp = observer(function LinkedProp(props: LinkedPropProps) {
  const { docsCtx, param } = props;
  const component = docsCtx.getFocusedComponent();
  const value = docsCtx.getComponentToggle(component, param);
  const tsType = wabToTsType(param.type, true);
  return (
    <PlasmicLinkedProp
      label={toVarName(param.variable.name)}
      type={
        <Tooltip title={<code>{tsType}</code>}>
          <span>{tsType}</span>
        </Tooltip>
      }
      children={
        <PropValueEditor
          label={param.variable.name}
          attr={param.variable.name}
          propType={wabTypeToPropType(param.type)}
          value={value}
          disabled={false}
          onChange={(newVal) =>
            docsCtx.setComponentToggle(component, param, newVal)
          }
        />
      }
    />
  );
});

export default LinkedProp;
