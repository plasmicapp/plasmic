import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { observer } from "mobx-react-lite";
import * as React from "react";
import { getStateVarName } from "src/wab/states";
import { Component, State } from "../../../../classes";
import { assert } from "../../../../common";
import { DefaultVariableRowProps } from "../../../plasmic/plasmic_kit_state_management/PlasmicVariableRow";
import { StudioCtx } from "../../../studio-ctx/StudioCtx";
import { ViewCtx } from "../../../studio-ctx/view-ctx";
import { WithContextMenu } from "../../ContextMenu";
import LabeledListItem from "../../widgets/LabeledListItem";
import { ValuePreview } from "../data-tab";
import { useVariableRow } from "./useVariableRow";

export interface ImplicitVariableRowProps extends DefaultVariableRowProps {
  component: Component;
  state: State;
  viewCtx: ViewCtx;
  sc: StudioCtx;
}

const ImplicitVariableRow = observer(
  function (props: ImplicitVariableRowProps, ref: HTMLElementRefOf<"div">) {
    const { component, state, sc, viewCtx, ...rest } = props;
    const {
      menu,
      modals,
      props: variableRowProps,
    } = useVariableRow({ sc, component, state, viewCtx });

    assert(state.tplNode, "implicit states should have a tpl node");

    return (
      <WithContextMenu overlay={menu} onClick={(e) => e.stopPropagation()}>
        <LabeledListItem
          data-test-id={getStateVarName(state)}
          data-test-type="implicit-variable-row"
          nesting="simple"
          ref={ref}
          valueSetState={variableRowProps.hasTempValue ? "isSet" : undefined}
          label={
            <label className="text-ellipsis-wrappable">
              {variableRowProps.name}
            </label>
          }
          onClick={variableRowProps.showVariableConfigModal}
          menu={menu}
          padding={"noHorizontal"}
          withIcon
          icon={<div className="property-connector-line-icon" />}
          {...rest}
        >
          <ValuePreview
            onClick={variableRowProps.showValueConfigModal}
            val={variableRowProps.value}
          />
        </LabeledListItem>
        {modals}
      </WithContextMenu>
    );
  },
  {
    forwardRef: true,
  }
);
export default ImplicitVariableRow;
