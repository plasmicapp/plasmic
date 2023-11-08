import { Tooltip } from "antd";
import { observer } from "mobx-react-lite";
import * as React from "react";
import { Param } from "../../../classes";
import { wabTypeToPropType } from "../../../shared/code-components/code-components";
import { toVarName } from "../../../shared/codegen/util";
import { wabToTsType } from "../../../shared/core/model-util";
import { PlasmicLinkedProp } from "../../plasmic/plasmic_kit_docs_portal/PlasmicLinkedProp";
import { PropValueEditor } from "../sidebar-tabs/PropValueEditor";
import { DocsPortalCtx } from "./DocsPortalCtx";

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
