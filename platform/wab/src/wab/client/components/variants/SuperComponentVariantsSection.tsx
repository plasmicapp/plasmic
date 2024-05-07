import { Component } from "@/wab/classes";
import ListSectionHeader from "@/wab/client/components/ListSectionHeader";
import { VariantsController } from "@/wab/client/components/variants/VariantsController";
import { makeReadOnlySection } from "@/wab/client/components/variants/VariantSection";
import { Icon } from "@/wab/client/components/widgets/Icon";
import VariantGroupIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__VariantGroup";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { observer } from "mobx-react";
import React from "react";

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
