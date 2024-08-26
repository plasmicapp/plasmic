import CodePreviewSnippet from "@/wab/client/components/docs/CodePreviewSnippet";
import { DocsPortalCtx } from "@/wab/client/components/docs/DocsPortalCtx";
import DocsPropsTableRow from "@/wab/client/components/docs/DocsPropsTableRow";
import { typeString } from "@/wab/client/components/docs/VariantProp";
import { PlasmicComponentView } from "@/wab/client/plasmic/plasmic_kit_docs_portal/PlasmicComponentView";
import { toVarName } from "@/wab/shared/codegen/util";
import { isPlumeComponent } from "@/wab/shared/core/components";
import { wabToTsType } from "@/wab/shared/model/model-util";
import {
  getPlumeDocsPlugin,
  PlumeDocsProp,
} from "@/wab/shared/plume/plume-registry";
import { getTplSlots } from "@/wab/shared/SlotUtils";
import { observer } from "mobx-react";
import * as React from "react";

const ComponentView = observer(({ docsCtx }: { docsCtx: DocsPortalCtx }) => {
  const component = docsCtx.getFocusedComponent();
  if (isPlumeComponent(component)) {
    return PlumeComponentView(docsCtx);
  }
  return null;
});

function PlumeComponentView(docsCtx: DocsPortalCtx) {
  const component = docsCtx.getFocusedComponent();
  const plugin = getPlumeDocsPlugin(component);

  const codePropNames = new Set(plugin?.codeProps?.map((n) => n.name));

  const variantGroups = component.variantGroups.filter(
    (vg) =>
      vg.variants.length > 0 &&
      !codePropNames.has(toVarName(vg.param.variable.name))
  );

  const slots = getTplSlots(component).filter(
    (s) => !codePropNames.has(toVarName(s.param.variable.name))
  );

  const otherProps = component.params.filter(
    (p) =>
      !slots.some((s) => s.param === p) &&
      !component.variantGroups.some((g) => g.param === p) &&
      !codePropNames.has(toVarName(p.variable.name))
  );

  const customProps: PlumeDocsProp[] = [
    ...variantGroups.map((vg) => ({
      name: toVarName(vg.param.variable.name),
      info: "Variant group.",
      type: typeString(vg),
    })),
    ...slots.map((s) => ({
      name: toVarName(s.param.variable.name),
      info: "Slot.",
      type: "ReactNode",
    })),
    ...otherProps.map((p) => ({
      name: toVarName(p.variable.name),
      info: "Prop.",
      type: wabToTsType(p.type, true),
    })),
  ];

  const allPropNames = new Set<string>(
    component.params.map((p) => toVarName(p.variable.name))
  );

  return (
    <PlasmicComponentView
      title={component.name}
      info={plugin?.docsInfo}
      examples={
        plugin?.examples?.map((example) => (
          <CodePreviewSnippet
            key={`${docsCtx.getCodegenType()}_${example.title}`}
            component={component}
            docsCtx={docsCtx}
            example={example}
          />
        )) || []
      }
      baseProps={{
        rows: (plugin?.codeProps || [])
          .filter((prop) => allPropNames.has(prop.name))
          .map((prop) => (
            <DocsPropsTableRow
              key={prop.name}
              prop={prop}
              site={docsCtx.studioCtx.site}
            />
          )),
      }}
      hideCustomProps={!customProps.length}
      customProps={{
        rows: customProps.map((prop) => (
          <DocsPropsTableRow
            key={prop.name}
            prop={prop}
            site={docsCtx.studioCtx.site}
          />
        )),
      }}
      componentType="plume"
      footer={plugin?.footer}
    />
  );
}

export default ComponentView;
