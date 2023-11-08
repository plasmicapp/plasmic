import { observer } from "mobx-react-lite";
import React from "react";
import { Component } from "../../../classes";
import VariantGroupIcon from "../../plasmic/plasmic_kit/PlasmicIcon__VariantGroup";
import { StudioCtx } from "../../studio-ctx/StudioCtx";
import { ViewCtx } from "../../studio-ctx/view-ctx";
import ListSectionHeader from "../ListSectionHeader";
import { Icon } from "../widgets/Icon";
import { VariantsController } from "./VariantsController";
import { makeReadOnlySection } from "./VariantSection";

export const SuperComponentVariantsSection = observer(
  function SuperComponentVariantsSection(props: {
    component: Component;
    vcontroller: VariantsController;
    studioCtx: StudioCtx;
    viewCtx?: ViewCtx;
  }) {
    const { component, vcontroller, studioCtx, viewCtx } = props;
    const [isExpanded, setExpanded] = React.useState(false);
    return (
      <div>
        <ListSectionHeader
          collapseState={isExpanded ? "expanded" : "collapsed"}
          onToggle={() => setExpanded(!isExpanded)}
        >
          {component.name} Variants
        </ListSectionHeader>
        {isExpanded &&
          component.variantGroups.map((group) =>
            makeReadOnlySection({
              studioCtx,
              viewCtx,
              vcontroller,
              icon: <Icon icon={VariantGroupIcon} />,
              title: group.param.variable.name,
              variants: group.variants,
              key: group.uuid,
            })
          )}
      </div>
    );
  }
);
