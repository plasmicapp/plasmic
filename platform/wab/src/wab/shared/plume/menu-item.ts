import { internalCanvasElementProps } from "@/wab/shared/canvas-constants";
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
import {
  jsLiteral,
  paramToVarName,
  toVarName,
} from "@/wab/shared/codegen/util";
import { Param, TplComponent } from "@/wab/shared/model/classes";
import { PlumePlugin } from "@/wab/shared/plume/plume-registry";
import { makeComponentImportPath } from "@/wab/shared/plume/plume-utils";
import { omit, pick } from "lodash";

const RESERVED_PROPS = [
  "isDisabled",
  "isHighlighted",
  "children",
  "value",
  "textValue",
];

const menuItemConfig = {
  isDisabledVariant: { group: "isDisabled", variant: "isDisabled" },
  isHighlightedVariant: { group: "isHighlighted", variant: "isHighlighted" },
  labelSlot: "children",
  root: "root",
  labelContainer: "labelContainer",
} as const;

export const MenuItemPlugin: PlumePlugin = {
  // PlumeCanvasPlugin
  genCanvasWrapperComponent: (sub, comp, observer, getCompMeta) => {
    return (allProps) =>
      observer(() => {
        const internalProps = pick(allProps, internalCanvasElementProps);
        const { plasmicProps } = sub.reactWeb.useMenuItem(
          Object.assign(comp, getCompMeta()),
          omit(allProps, internalCanvasElementProps),
          menuItemConfig as any
        );
        return sub.React.createElement(comp, {
          ...plasmicProps,
          ...internalProps,
        });
      });
  },

  // PlumeCodegenPlugin

  genHook(ctx: SerializerBaseContext) {
    const { component } = ctx;

    return `
      function useBehavior<P extends pp.BaseSelectOptionProps>(props: P) {
        return pp.useMenuItem(
          ${makePlasmicComponentName(component)},
          props,
          ${jsLiteral(menuItemConfig)}
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
      } extends pp.BaseMenuItemProps {
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

      function ${componentName}(props: ${propsName}) {
        const { plasmicProps } = ${plasmicComponentName}.useBehavior(props);
        return <${plasmicComponentName} {...plasmicProps} />;
      }

      export default Object.assign(
        ${componentName},
        ${this.genSerializedSkeletonFields(ctx)}
      );
    `;
  },
  genSkeletonImports(ctx) {
    return {
      imports: "",
    };
  },
  genSerializedSkeletonFields(ctx) {
    return `
      {
        __plumeType: "menu-item"
      }`;
  },

  // Plume editor plugin
  shouldShowInstanceProp(tpl: TplComponent | null, prop: Param) {
    return !["isHighlighted"].includes(toVarName(prop.variable.name));
  },

  componentMeta: {
    name: "Menu.Item",
    description:
      "A item for a Menu component.  Should only be used in the children slot of Menu or Menu.Group.",
    variantDefs: [
      {
        group: "isDisabled",
        variant: "isDisabled",
        info: "Shows this Item as disabled; the user will not be able to select this item.",
        required: true,
      },
      {
        group: "isHighlighted",
        variant: "isHighlighted",
        info: "Shows this Item as highlighted and in focus, either because the mouse is hovering over it, or the user has focused it with the keyboard.",
        required: true,
      },
    ],
    slotDefs: [
      {
        name: "children",
        info: `The content label for this menu item.`,
        required: true,
      },
    ],
    elementDefs: [
      {
        name: "root",
        info: `The root of the Item`,
        required: true,
      },
      {
        name: "labelContainer",
        info: `The element immediately wrapping the children slot; will be marked as the aria-labelledby for this item.`,
        required: true,
      },
    ],
  },
  tagToAttachEventHandlers: "div",
};
