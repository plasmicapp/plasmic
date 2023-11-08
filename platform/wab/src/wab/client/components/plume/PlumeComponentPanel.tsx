import { Alert } from "antd";
import { observer } from "mobx-react-lite";
import * as React from "react";
import { Component } from "../../../classes";
import { withoutNils } from "../../../common";
import { joinReactNodes } from "../../../commons/components/ReactUtil";
import { allComponentVariants } from "../../../components";
import { flattenComponent } from "../../../shared/cached-selectors";
import {
  getPlumeEditorPlugin,
  getPlumeElementDef,
  getPlumeSlotDef,
  getPlumeVariantDef,
} from "../../../shared/plume/plume-registry";
import { isTplSlot } from "../../../tpls";
import { SidebarSection } from "../sidebar/SidebarSection";
import { HoverableDisclosure } from "../widgets/HoverableDisclosure";

export const PlumeMissingIngredientsPanel = observer(
  function PlumeMissingIngredientsPanel(props: { component: Component }) {
    const { component } = props;
    const plugin = getPlumeEditorPlugin(component);
    if (!plugin) {
      return null;
    }

    const meta = plugin.componentMeta;

    const foundVariantDefs = withoutNils(
      allComponentVariants(component).map((v) =>
        getPlumeVariantDef(component, v)
      )
    );

    const elements = flattenComponent(component);
    const foundSlotDefs = withoutNils(
      elements.filter(isTplSlot).map((e) => getPlumeSlotDef(component, e.param))
    );
    const foundElementDefs = withoutNils(
      elements.map((e) => getPlumeElementDef(component, e))
    );

    const missingVariantDefs = meta.variantDefs.filter(
      (d) => !foundVariantDefs.includes(d)
    );
    const missingSlotDefs = meta.slotDefs.filter(
      (d) => !foundSlotDefs.includes(d)
    );
    const missingElementDefs = meta.elementDefs.filter(
      (d) => !foundElementDefs.includes(d)
    );

    if (
      missingVariantDefs.length === 0 &&
      missingSlotDefs.length === 0 &&
      missingElementDefs.length === 0
    ) {
      return null;
    }
    return (
      <SidebarSection>
        <Alert
          type="warning"
          message={
            <>
              {missingVariantDefs.length > 0 && (
                <div>
                  <strong>Missing variants: </strong>
                  {joinReactNodes(
                    missingVariantDefs.map((d) => (
                      <HoverableDisclosure title={d.info}>
                        {d.variant}
                      </HoverableDisclosure>
                    )),
                    ", "
                  )}
                </div>
              )}
              {missingSlotDefs.length > 0 && (
                <div>
                  <strong>Missing slots: </strong>
                  {joinReactNodes(
                    missingSlotDefs.map((d) => (
                      <HoverableDisclosure title={d.info}>
                        {d.name}
                      </HoverableDisclosure>
                    )),
                    ", "
                  )}
                </div>
              )}
              {missingElementDefs.length > 0 && (
                <div>
                  <strong>Missing elements: </strong>
                  {joinReactNodes(
                    missingElementDefs.map((d) => (
                      <HoverableDisclosure title={d.info}>
                        {d.name}
                      </HoverableDisclosure>
                    )),
                    ", "
                  )}
                </div>
              )}
            </>
          }
        />
      </SidebarSection>
    );
  }
);
