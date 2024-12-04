import {
  getExternalParams,
  serializeParamType,
} from "@/wab/shared/codegen/react-p/params";
import {
  getExportedComponentName,
  makeDefaultExternalPropsName,
  makePlasmicComponentName,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import { getPlumePackageName } from "@/wab/shared/codegen/react-p/utils";
import {
  jsLiteral,
  paramToVarName,
  toVarName,
} from "@/wab/shared/codegen/util";
import { PlumePlugin } from "@/wab/shared/plume/plume-registry";
import { makeComponentImportPath } from "@/wab/shared/plume/plume-utils";
import type { TriggeredOverlayRef } from "@plasmicapp/react-web";

const RESERVED_PROPS = ["relativePlacement"];

const triggeredOverlayConfig = {
  isPlacedTopVariant: { group: "relativePlacement", variant: "top" },
  isPlacedBottomVariant: { group: "relativePlacement", variant: "bottom" },
  isPlacedLeftVariant: { group: "relativePlacement", variant: "left" },
  isPlacedRightVariant: { group: "relativePlacement", variant: "right" },
  contentSlot: "children",
  root: "root",
} as const;

export const TriggeredOverlayPlugin: PlumePlugin = {
  // PlumeCanvasPlugin
  genCanvasWrapperComponent: (sub, comp, observer) => {
    return sub.React.forwardRef((allProps, ref: TriggeredOverlayRef) =>
      observer(() => {
        // We are editing the Overlay component itself - don't need the hook
        // and using it will throw.
        return sub.React.createElement(comp, { ...allProps, ref });
      })
    );
  },

  // PlumeCodegenPlugin
  genHook(ctx: SerializerBaseContext) {
    const { component } = ctx;
    return `
      function useBehavior<P extends pp.BaseTriggeredOverlayProps>(props: P, ref: pp.TriggeredOverlayRef) {
        return pp.useTriggeredOverlay(
          ${makePlasmicComponentName(component)},
          props,
          ${jsLiteral(triggeredOverlayConfig)},
          ref
        );
      }
    `;
  },
  genDefaultExternalProps(ctx: SerializerBaseContext, opts) {
    const { component } = ctx;
    const params = getExternalParams(ctx).filter(
      (p) => !RESERVED_PROPS.includes(toVarName(p.variable.name))
    );
    return `
      export interface ${
        opts?.typeName ?? makeDefaultExternalPropsName(component)
      } extends pp.BaseTriggeredOverlayProps {
        ${params
          .map(
            (param) =>
              `"${paramToVarName(ctx.component, param)}"?: ${serializeParamType(
                component,
                param,
                ctx.projectFlags
              )}`
          )
          .join(";\n")}
      }
    `;
  },
  genSkeleton(ctx: SerializerBaseContext) {
    const { component } = ctx;
    const plasmicComponentName = makePlasmicComponentName(component);
    const componentName = getExportedComponentName(component);
    const defaultPropsName = makeDefaultExternalPropsName(component);
    const propsName = `${componentName}Props`;
    const componentSubstitutionApi = ctx.exportOpts.useComponentSubstitutionApi
      ? `import { components } from "@plasmicapp/loader-runtime-registry";

    export function getPlasmicComponent() {
      return components["${component.uuid}"] ?? ${componentName};
    }`
      : "";
    return `
      import * as React from "react";
      import {${plasmicComponentName}, ${defaultPropsName}} from "${
      ctx.exportOpts.relPathFromImplToManagedDir
    }/${makeComponentImportPath(
      component,
      ctx,
      "render"
    )}";  // plasmic-import: ${component.uuid}/render
    ${this.genSkeletonImports(ctx).imports}

      ${componentSubstitutionApi}

      export interface ${propsName} extends ${defaultPropsName} {
        // Feel free to add any additional props that this component should receive
      }

      function ${componentName}_(props: ${propsName}, ref: TriggeredOverlayRef) {
        const { plasmicProps } = ${plasmicComponentName}.useBehavior(props, ref);
        return <${plasmicComponentName} {...plasmicProps} />;
      }

      const ${componentName} = React.forwardRef(${componentName}_);

      export default Object.assign(
        ${componentName},
        ${this.genSerializedSkeletonFields(ctx)}
      );
    `;
  },
  genSerializedSkeletonFields(ctx) {
    return `{
        __plumeType: "triggered-overlay"
      }`;
  },
  genSkeletonImports(ctx) {
    return {
      imports: `
        import {TriggeredOverlayRef} from "${getPlumePackageName(
          ctx.exportOpts,
          "triggered-overlay"
        )}";`,
      refName: "TriggeredOverlayRef",
    };
  },
  //
  // PlumeEditorPlugin
  //
  componentMeta: {
    name: "TriggeredOverlay",
    description: `Shows an overlay that is positioned relative to its trigger.`,
    variantDefs: [
      {
        group: "relativePlacement",
        variant: "top",
        info: `The overlay is placed above the trigger; may have an arrow pointing down, or extra spacing at the bottom to offset from trigger.`,
        required: false,
      },
      {
        group: "relativePlacement",
        variant: "bottom",
        info: `The overlay is placed below the trigger; may have an arrow pointing up, or extra spacing at the top to offset from trigger.`,
        required: false,
      },
      {
        group: "relativePlacement",
        variant: "left",
        info: `The overlay is placed to the left of the trigger; may have an arrow pointing right, or extra spacing on the right to offset from trigger.`,
        required: false,
      },
      {
        group: "relativePlacement",
        variant: "right",
        info: `The overlay is placed to the right the trigger; may have an arrow pointing left, or extra spacing on the left to offset from trigger.`,
        required: false,
      },
    ],
    slotDefs: [
      {
        name: "children",
        info: `Content of the overlay.`,
        required: true,
      },
    ],
    elementDefs: [
      {
        name: "root",
        info: "The root element of the overlay.",
        required: true,
      },
    ],
  },
  tagToAttachEventHandlers: "div",
};
