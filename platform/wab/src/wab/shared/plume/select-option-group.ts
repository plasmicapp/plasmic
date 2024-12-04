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
import { Component, Param, TplComponent } from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import { PlumePlugin } from "@/wab/shared/plume/plume-registry";
import { makeComponentImportPath } from "@/wab/shared/plume/plume-utils";
import { omit, pick } from "lodash";

const RESERVED_PROPS = ["isFirst", "children"];

const selectOptionGroupConfig = {
  noTitleVariant: { group: "noTitle", variant: "noTitle" },
  isFirstVariant: { group: "isFirst", variant: "isFirst" },
  optionsSlot: "children",
  titleSlot: "title",

  root: "root",
  separator: "separator",
  titleContainer: "titleContainer",
  optionsContainer: "optionsContainer",
} as const;

export const SelectOptionGroupPlugin: PlumePlugin = {
  // PlumeCanvasPlugin
  genCanvasWrapperComponent: (sub, comp, observer, getCompMeta) => {
    return (allProps) =>
      observer(() => {
        const internalProps = pick(allProps, internalCanvasElementProps);
        const { plasmicProps } = sub.reactWeb.useSelectOptionGroup(
          Object.assign(comp, getCompMeta()),
          omit(allProps, internalCanvasElementProps),
          selectOptionGroupConfig as any
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
      function useBehavior<P extends pp.BaseSelectOptionGroupProps>(props: P) {
        return pp.useSelectOptionGroup(
          ${makePlasmicComponentName(component)},
          props,
          ${jsLiteral(selectOptionGroupConfig)}
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
      } extends pp.BaseSelectOptionGroupProps {
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
  genSerializedSkeletonFields(ctx) {
    return `
      {
        __plumeType: "select-option-group"
      }`;
  },
  genSkeletonImports(ctx) {
    return {
      imports: ``,
    };
  },

  // Plume editor plugin
  shouldShowInstanceProp(tpl: TplComponent | null, prop: Param) {
    return !["isFirst"].includes(toVarName(prop.variable.name));
  },

  getSlotType(component: Component, param: Param) {
    if (param.variable.name === "children" && component.superComp) {
      const option = component.superComp.subComps.find(
        (c) => c.plumeInfo?.type === "select-option"
      );
      if (option) {
        return typeFactory.renderable({
          params: [typeFactory.instance(option)],
          allowRootWrapper: undefined,
        });
      }
    }
    return undefined;
  },

  componentMeta: {
    name: "Select.OptionGroup",
    description: "Groups a collection of Options for a Select component.",
    variantDefs: [
      {
        group: "noTitle",
        variant: "noTitle",
        info: `Shows the OptionGroup without a visible title heading.`,
        required: true,
      },
      {
        group: "isFirst",
        variant: "isFirst",
        info: `Shows the OptionGroup when it is the first OptionGroup in a Select. Typically, you would want to hide the separator in this case.`,
        required: true,
      },
    ],
    slotDefs: [
      {
        name: "children",
        info: `Slot for Options that belong in this OptionGroup.`,
        required: true,
      },
      {
        name: "title",
        info: `Slot for the title header of this OptionGroup.`,
        required: true,
      },
    ],
    elementDefs: [
      {
        name: "root",
        info: `Root element of the OptionGroup.`,
        required: true,
      },
      {
        name: "separator",
        info: `A visual separator (often a line) at the beginning of the OptionGroup, separating it from other OptionGroups.  Should be hidden for the "isFirst" variant.`,
        required: true,
      },
      {
        name: "titleContainer",
        info: `Container immediately wrapping the "title" slot.`,
        required: true,
      },
      {
        name: "optionsContainer",
        info: `Container immediately wrapping the "children" slot.`,
        required: true,
      },
    ],
  },
  tagToAttachEventHandlers: "optgroup",
};
