import { Component, isKnownTplNode, TplComponent, TplTag } from "@/wab/classes";
import { MenuBuilder } from "@/wab/client/components/menu-builder";
import { PlumyIcon } from "@/wab/client/components/plume/plume-markers";
import { getContextDependentValuesForImplicitState } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerUtil";
import { createNodeIcon } from "@/wab/client/components/sidebar-tabs/tpl-tree";
import { EditableLabel } from "@/wab/client/components/widgets/EditableLabel";
import {
  DefaultImplicitVariablesSectionProps,
  PlasmicImplicitVariablesSection,
} from "@/wab/client/plasmic/plasmic_kit_state_management/PlasmicImplicitVariablesSection";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { ensure, spawn } from "@/wab/common";
import { getPlumeElementDef } from "@/wab/shared/plume/plume-registry";
import { purpleDark8 } from "@/wab/styles/_tokens";
import { isTplTagOrComponent } from "@/wab/tpls";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { Menu } from "antd";
import assert from "assert";
import { computed } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import ImplicitVariableRow from "./ImplicitVariableRow";

export interface ImplicitVariablesSectionProps
  extends DefaultImplicitVariablesSectionProps {
  sc: StudioCtx;
  viewCtx: ViewCtx;
  component: Component;
  tpl: TplComponent | TplTag;
}

const ImplicitVariablesSection = observer(
  React.forwardRef(function ImplicitVariablesSection(
    props: ImplicitVariablesSectionProps,
    ref: HTMLElementRefOf<"div">
  ) {
    const { sc, component, tpl, viewCtx, ...rest } = props;

    assert(viewCtx, "component should have a focused or first view ctx");

    const [defaultEditing, setDefaultEditing] = React.useState(false);

    const headerMenu = React.useMemo(() => {
      const builder = new MenuBuilder();
      builder.genSection(undefined, (push) => {
        push(
          <Menu.Item key="renmame-tpl" onClick={() => setDefaultEditing(true)}>
            Rename
          </Menu.Item>
        );
      });
      return builder.build({
        menuName: "implicit-variable-menu",
      });
    }, [tpl]);

    const effectiveVs = computed(
      () =>
        isTplTagOrComponent(tpl)
          ? viewCtx.variantTplMgr().effectiveVariantSetting(tpl)
          : undefined,
      { name: "implicitVaraiblesSection.effectiveVs" }
    );
    const plumeDef = isKnownTplNode(tpl)
      ? getPlumeElementDef(component, tpl)
      : undefined;
    const icon = computed(
      () => {
        const node = createNodeIcon(tpl, effectiveVs.get());
        if (plumeDef) {
          return <PlumyIcon def={plumeDef}>{node}</PlumyIcon>;
        } else {
          return node;
        }
      },
      { name: "icon" }
    ).get();

    return (
      <PlasmicImplicitVariablesSection
        root={{ ref }}
        {...rest}
        icon={<span style={{ color: purpleDark8 }}>{icon}</span>}
        title={
          <EditableLabel
            value={ensure(tpl.name, "stateful nodes should have a name")}
            key={`${defaultEditing}`}
            defaultEditing={defaultEditing}
            doubleClickToEdit
            onEdit={(val) => {
              spawn(
                sc.change(({ success }) => {
                  if (val !== "") {
                    sc.tplMgr().renameTpl(component, tpl, val);
                  }
                  return success();
                })
              );
              setDefaultEditing(false);
            }}
            onAbort={() => setDefaultEditing(false)}
          />
        }
        tplRow={{
          menu: headerMenu,
          children: null,
          onClick: () => {
            viewCtx.change(() => {
              viewCtx.setStudioFocusByTpl(tpl, undefined);
            });
          },
        }}
        // isSelected={viewCtx.focusedTpls().includes(tpl)}
        // color={viewCtx.isEditingNonBaseVariant ? "variant" : undefined}
      >
        {component.states
          .filter((state) => state.tplNode === tpl)
          .filter(
            (state) =>
              !getContextDependentValuesForImplicitState(viewCtx, state).hidden
          )
          .map((state) => (
            <ImplicitVariableRow
              viewCtx={viewCtx}
              state={state}
              sc={sc}
              component={component}
              key={state.uid}
            />
          ))}
      </PlasmicImplicitVariablesSection>
    );
  })
);
export default ImplicitVariablesSection;
