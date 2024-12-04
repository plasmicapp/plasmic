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
import { getPlumePackageName } from "@/wab/shared/codegen/react-p/utils";
import {
  jsLiteral,
  paramToVarName,
  toVarName,
} from "@/wab/shared/codegen/util";
import { assert } from "@/wab/shared/common";
import { Param, TplComponent } from "@/wab/shared/model/classes";
import { PlumePlugin } from "@/wab/shared/plume/plume-registry";
import {
  ensureValidPlumeCodeMeta,
  makeComponentImportPath,
} from "@/wab/shared/plume/plume-utils";
import type { SelectOptionRef } from "@plasmicapp/react-web";
import { omit, pick } from "lodash";
import React from "react";

const RESERVED_PROPS = [
  "isSelected",
  "isDisabled",
  "isHighlighted",
  "children",
  "value",
  "textValue",
];

const selectOptionConfig = {
  isSelectedVariant: { group: "isSelected", variant: "isSelected" },
  isDisabledVariant: { group: "isDisabled", variant: "isDisabled" },
  isHighlightedVariant: { group: "isHighlighted", variant: "isHighlighted" },
  labelSlot: "children",
  root: "root",
  labelContainer: "labelContainer",
} as const;

export const SelectOptionPlugin: PlumePlugin = {
  // PlumeCanvasPlugin
  genCanvasWrapperComponent: (sub, comp, observer, getCompMeta) => {
    return sub.React.forwardRef((allProps, ref: SelectOptionRef) =>
      observer(() => {
        const internalProps = pick(allProps, internalCanvasElementProps);
        const { plasmicProps } = sub.reactWeb.useSelectOption(
          Object.assign(comp, getCompMeta()),
          omit(allProps, internalCanvasElementProps),
          selectOptionConfig as any,
          ref
        );

        return sub.React.createElement(comp, {
          ...plasmicProps,
          ...internalProps,
        });
      })
    );
  },

  // PlumeCodegenPlugin

  genHook(ctx: SerializerBaseContext) {
    const { component } = ctx;

    return `
      function useBehavior<P extends pp.BaseSelectOptionProps>(props: P, ref: pp.SelectOptionRef) {
        return pp.useSelectOption(
          ${makePlasmicComponentName(component)},
          props,
          ${jsLiteral(selectOptionConfig)},
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
      } extends pp.BaseSelectOptionProps {
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

      function ${componentName}_(props: ${propsName}, ref: SelectOptionRef) {
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
    return `
    {
      __plumeType: "select-option"
    }`;
  },
  genSkeletonImports(ctx) {
    return {
      imports: `
      import {SelectOptionRef} from "${getPlumePackageName(
        ctx.exportOpts,
        "select-option"
      )}";`,
      refName: "SelectOptionRef",
    };
  },

  // Plume editor plugin
  shouldShowInstanceProp(tpl: TplComponent | null, prop: Param) {
    return !["isSelected", "isHighlighted"].includes(
      toVarName(prop.variable.name)
    );
  },

  codeComponentMeta: (comp) =>
    ensureValidPlumeCodeMeta(comp, {
      props: {
        textValue: {
          type: "string",
          advanced: true,
          description: "Text used to search for this option",
        },
        children: {
          type: "slot",
          ...({
            mergeWithParent: true,
          } as any),
        },
      },
    }),

  componentMeta: {
    name: "Select.Option",
    description:
      "A selectable Option for a Select component, rendered in the Select dropdown menu. Should only be used in the children slot of Select or Select.OptionGroup.",
    variantDefs: [
      {
        group: "isSelected",
        variant: "isSelected",
        info: "Shows this Option as the currently-selected Option.",
        required: true,
      },
      {
        group: "isDisabled",
        variant: "isDisabled",
        info: "Shows this Option as disabled; the user will not be able to select this Option.",
        required: true,
      },
      {
        group: "isHighlighted",
        variant: "isHighlighted",
        info: "Shows this Option as highlighted and in focus, either because the mouse is hovering over it, or the user has focused it with the keyboard.",
        required: true,
      },
    ],
    slotDefs: [
      {
        name: "children",
        info: `The content label for this Option.`,
        required: true,
      },
    ],
    elementDefs: [
      {
        name: "root",
        info: `The root of the Option`,
        required: true,
      },
      {
        name: "labelContainer",
        info: `The element immediately wrapping the children slot; will be marked as the aria-labelledby for this option.`,
        required: true,
      },
    ],
  },
  tagToAttachEventHandlers: "option",
};

export function getSelectOptionValue(elt: React.ReactElement) {
  assert(
    (elt.type as any).__plumeType === "select-option",
    `Expected plume type to be 'select-option', but found: ${
      (elt.type as any).__plumeType
    }`
  );
  return elt.props.value as string;
}
