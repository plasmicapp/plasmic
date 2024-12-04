import { getTplSlotByName } from "@/wab/shared/SlotUtils";
import { internalCanvasElementProps } from "@/wab/shared/canvas-constants";
import {
  getExternalParams,
  serializeParamType,
} from "@/wab/shared/codegen/react-p/params";
import {
  getExportedComponentName,
  getImportedComponentName,
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
import { assert, ensure, withoutNils } from "@/wab/shared/common";
import { Component, Param } from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import { PlumePlugin } from "@/wab/shared/plume/plume-registry";
import {
  createDefaultSlotContentsStub,
  makeComponentImportPath,
  maybeIncludeSerializedDefaultSlotContent,
  serializeComponentSubstitutionCallsForDefaultContents,
} from "@/wab/shared/plume/plume-utils";
import type { MenuRef } from "@plasmicapp/react-web";
import { omit, pick } from "lodash";
import type React from "react";

const RESERVED_PROPS = ["children"];

const menuConfig = {
  itemsSlot: "children",
  root: "root",
  itemsContainer: "itemsContainer",
} as const;

export const MenuPlugin: PlumePlugin = {
  // PlumeCanvasPlugin
  genCanvasWrapperComponent: (sub, impl, observer, getCompMeta, component) => {
    return sub.React.forwardRef((allProps, ref: MenuRef) =>
      observer(() => {
        const internalProps = pick(allProps, internalCanvasElementProps);
        let componentProps = omit(allProps, internalCanvasElementProps);
        let usingDefaultChildren: false | React.ReactElement = false;
        if (
          !("children" in componentProps) &&
          getTplSlotByName(component, "children")?.defaultContents.length
        ) {
          usingDefaultChildren = createDefaultSlotContentsStub(sub);
          componentProps = {
            ...componentProps,
            children: usingDefaultChildren,
          };
        }
        const { plasmicProps } = sub.reactWeb.useMenu(
          Object.assign(impl, getCompMeta()),
          componentProps,
          menuConfig as any,
          ref
        );
        if (usingDefaultChildren) {
          assert(
            plasmicProps.args.children === usingDefaultChildren,
            () => `Expected children to match slot stub`
          );
          delete plasmicProps.args.children;
        }
        return sub.React.createElement(impl, {
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
      function useBehavior<P extends pp.BaseMenuProps>(props: P, ref: pp.MenuRef) {
        ${serializeComponentSubstitutionCallsForDefaultContents(ctx, [
          "children",
        ])}
        ${maybeIncludeSerializedDefaultSlotContent(ctx, "children")}
        return pp.useMenu(
          ${makePlasmicComponentName(component)},
          props,
          ${jsLiteral(menuConfig)},
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
      } extends pp.BaseMenuProps {
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

      function ${componentName}_(props: ${propsName}, ref: MenuRef) {
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
    const { component } = ctx;
    const itemSubComp = ensure(
      component.subComps.find((comp) => comp.plumeInfo?.type === "menu-item"),
      () => "Expected to find menu-item"
    );
    const groupSubComp = ensure(
      component.subComps.find((comp) => comp.plumeInfo?.type === "menu-group"),
      () => "Expected to find menu-group"
    );
    return `
      {
        Item: ${getImportedComponentName(ctx.aliases, itemSubComp)},
        Group: ${getImportedComponentName(ctx.aliases, groupSubComp)},
        __plumeType: "menu"
      }`;
  },
  genSkeletonImports(ctx) {
    const { component } = ctx;
    const itemSubComp = ensure(
      component.subComps.find((comp) => comp.plumeInfo?.type === "menu-item"),
      () => "Expected to find menu-item"
    );
    const groupSubComp = ensure(
      component.subComps.find((comp) => comp.plumeInfo?.type === "menu-group"),
      () => "Expected to find menu-group"
    );
    return {
      imports: `
        import {MenuRef} from "${getPlumePackageName(ctx.exportOpts, "menu")}";
        import Item from "./${makeComponentImportPath(
          itemSubComp,
          ctx,
          "skeleton"
        )}";  // plasmic-import: ${itemSubComp.uuid}/component
        import Group from "./${makeComponentImportPath(
          groupSubComp,
          ctx,
          "skeleton"
        )}";  // plasmic-import: ${groupSubComp.uuid}/component`,
      refName: "MenuRef",
    };
  },

  getSlotType(component: Component, param: Param) {
    if (param.variable.name === "children") {
      const item = component.subComps.find(
        (c) => c.plumeInfo?.type === "menu-item"
      );
      const group = component.subComps.find(
        (c) => c.plumeInfo?.type === "menu-group"
      );
      return typeFactory.renderable({
        params: withoutNils([
          item ? typeFactory.instance(item) : undefined,
          group ? typeFactory.instance(group) : undefined,
        ]),
        allowRootWrapper: undefined,
      });
    }

    return undefined;
  },

  //
  // PlumeEditorPlugin
  //
  componentMeta: {
    name: "Menu",
    description: `Shows a list of actions as an overlay.`,
    variantDefs: [],
    slotDefs: [
      {
        name: "children",
        info: `Slot for the Items of this Menu.`,
        required: true,
      },
    ],
    elementDefs: [
      {
        name: "root",
        info: "The root element of the Menu; must be an instance of Menu.Overlay component.",
        required: true,
      },
      {
        name: "itemsContainer",
        info: `The container for Menu items; it should immediately wrap the "children" slot.  If your menu should be scrollabel if there's not enough room, you should set overflow to scroll on this element.`,
        required: true,
      },
    ],
  },

  // PlumeDocsPlugin
  docsInfo:
    "This is a special component that renders a Menu, i.e., a list of actions as an overlay, with behavior and accessibility.",
  subs: {
    "menu-item": "Item",
  },
  examples: [
    {
      title: "Basic usage",
      info: "Use the children prop to specify the actions in the menu.",
      code: `
        return <InstanceMenu />;
      `,
      instances: {
        Menu: {
          props: {
            "aria-label": '"Label for accessibility"',
            children: "<><InstanceA /><InstanceB /></>",
          },
        },
        A: {
          plumeType: "menu-item",
          props: {
            key: '"A"',
            onAction: '() => alert("A")',
            children: '"Alert A"',
          },
        },
        B: {
          plumeType: "menu-item",
          props: {
            key: '"B"',
            onAction: '() => alert("B")',
            children: '"Alert B"',
          },
        },
      },
    },
    {
      title: "Handling actions",
      info: "You can handle actions on the menu container instead of in the items.",
      code: `
        return <InstanceMenu />;
      `,
      instances: {
        Menu: {
          props: {
            "aria-label": '"Label for accessibility"',
            onAction: "(value: string) => alert(value)",
            children: "<><InstanceA /><InstanceB /></>",
          },
        },
        A: {
          plumeType: "menu-item",
          props: {
            key: '"A"',
            value: '"Value A"',
            children: '"Alert A"',
          },
        },
        B: {
          plumeType: "menu-item",
          props: {
            key: '"B"',
            value: '"Value B"',
            children: '"Alert B"',
          },
        },
      },
    },
  ],
  codeProps: [
    {
      name: "children",
      info: `List of actions.`,
      type: "Item[]",
    },
    {
      name: "onAction",
      info: `Event handler fired when item is clicked.`,
      type: "(value: string) => void",
    },
  ],
  reservedProps: RESERVED_PROPS,
  tagToAttachEventHandlers: "input",
};
