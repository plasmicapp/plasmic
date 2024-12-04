import { getTplSlotByName, getTplSlotForParam } from "@/wab/shared/SlotUtils";
import { TplMgr, ensureBaseVariant } from "@/wab/shared/TplMgr";
import { ensureBaseVariantSetting } from "@/wab/shared/VariantTplMgr";
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
import { assert, ensure } from "@/wab/shared/common";
import { getParamByVarName } from "@/wab/shared/core/components";
import { fixParentPointers, mkTplComponent } from "@/wab/shared/core/tpls";
import {
  Component,
  Param,
  Site,
  TplComponent,
} from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import { PlumePlugin } from "@/wab/shared/plume/plume-registry";
import {
  createDefaultSlotContentsStub,
  makeComponentImportPath,
  maybeIncludeSerializedDefaultSlotContent,
  serializeComponentSubstitutionCallsForDefaultContents,
} from "@/wab/shared/plume/plume-utils";
import type { BaseMenuButtonProps, MenuButtonRef } from "@plasmicapp/react-web";
import { omit, pick } from "lodash";
import type React from "react";

const RESERVED_PROPS = ["isOpen", "isDisabled", "menu"];

const menuButtonConfig = {
  isOpenVariant: { group: "isOpen", variant: "isOpen" },
  isDisabledVariant: { group: "isDisabled", variant: "isDisabled" },
  menuSlot: "menu",
  root: "root",
  trigger: "trigger",
} as const;

export const MenuButtonPlugin: PlumePlugin = {
  // PlumeCanvasPlugin
  genCanvasWrapperComponent: (sub, impl, observer, getCompMeta, component) => {
    return sub.React.forwardRef((allProps, ref: MenuButtonRef) =>
      observer(() => {
        const internalProps = pick(allProps, internalCanvasElementProps);
        let usingDefaultMenu: false | React.ReactElement = false;
        let componentProps = omit(allProps, internalCanvasElementProps);
        if (
          !("menu" in componentProps) &&
          getTplSlotByName(component, "menu")?.defaultContents.length
        ) {
          usingDefaultMenu = createDefaultSlotContentsStub(sub);
          componentProps = {
            ...componentProps,
            menu: usingDefaultMenu,
          };
        }
        const { plasmicProps } = sub.reactWeb.useMenuButton(
          Object.assign(impl, getCompMeta()),
          componentProps as BaseMenuButtonProps,
          menuButtonConfig as any,
          ref
        );
        if (usingDefaultMenu) {
          assert(
            plasmicProps.args.menu === usingDefaultMenu,
            () => `Expected menu to match slot stub`
          );
          delete plasmicProps.args.menu;
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
      function useBehavior<P extends pp.BaseMenuButtonProps>(props: P, ref: pp.MenuButtonRef) {
        ${serializeComponentSubstitutionCallsForDefaultContents(ctx, ["menu"])}
        ${maybeIncludeSerializedDefaultSlotContent(ctx, "menu")}
        return pp.useMenuButton(
          ${makePlasmicComponentName(component)},
          props,
          ${jsLiteral(menuButtonConfig)},
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
      } extends pp.BaseMenuButtonProps {
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

      function ${componentName}_(props: ${propsName}, ref: MenuButtonRef) {
        const { plasmicProps, state } = ${plasmicComponentName}.useBehavior(props, ref);
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
    return `{ __plumeType: "menu-button" }`;
  },
  genSkeletonImports(ctx) {
    return {
      imports: `
        import {MenuButtonRef} from "${getPlumePackageName(
          ctx.exportOpts,
          "menu-button"
        )}";`,
      refName: "MenuButtonRef",
    };
  },

  twiddleGenInstanceProps(tpl: TplComponent, attrs) {
    // Never set isOpen
    delete attrs["isOpen"];
  },

  getSlotType(component: Component, param: Param) {
    if (param.variable.name === "menu") {
      return typeFactory.renderable({
        params: [typeFactory.plumeInstance("menu")],
        allowRootWrapper: undefined,
      });
    }
    return undefined;
  },

  //
  // PlumeEditorPlugin
  //
  componentMeta: {
    name: "MenuButton",
    description: `A button that, when triggered, shows a dropdown menu of actions.`,
    variantDefs: [
      {
        group: "isOpen",
        variant: "isOpen",
        info: `Renders the MenuButton with the dropdown menu shown.`,
        required: true,
      },
      {
        group: "isDisabled",
        variant: "isDisabled",
        info: `Renders the button in "disabled" state; the user cannot interact with the MenuButton in this state.`,
        required: true,
      },
    ],
    slotDefs: [
      {
        name: "menu",
        info: `Slot for the Menu; should only be visible for the "isOpen" variant. Should only place a single Menu instance here.`,
        required: true,
      },
    ],
    elementDefs: [
      {
        name: "root",
        info: "The root element of the MenuButton, containing the trigger button and the driopdown menu.",
        required: true,
      },
      {
        name: "trigger",
        info: `The trigger button; will show the menu when clicked.`,
        required: true,
      },
    ],
  },

  onComponentCreated(site: Site, plumeSite: Site, component: Component) {
    // default slot of menu prop references a Menu component; so make sure it exists
    const tplMgr = new TplMgr({ site });
    let menuComponent = site.components.filter(
      (c) => c.plumeInfo?.type === "menu"
    )[0];
    if (!menuComponent) {
      menuComponent = tplMgr.clonePlumeComponent(
        plumeSite,
        "Menu",
        "Menu",
        true
      );
    }

    const menuParam = getParamByVarName(component, "menu");
    if (menuParam) {
      const slot = ensure(
        getTplSlotForParam(component, menuParam),
        () => "Expected to find slot for `menu`"
      );
      const menu = mkTplComponent(menuComponent, ensureBaseVariant(component));
      slot.defaultContents = [menu];
      fixParentPointers(component.tplTree);
      ensureBaseVariantSetting(component, menu);
    }
  },

  // PlumeDocsPlugin
  deps: ["menu"],
  docsInfo:
    "This is a special component that renders a MenuButton with behavior and accessibility.",
  examples: [
    {
      title: "Basic usage",
      info: "Use the menu prop to specify a menu that opens when the button is clicked.",
      code: `
        const menu = <InstanceMenu />;
        return <InstanceButton />;
      `,
      instances: {
        Button: {
          props: {
            menu: "menu",
            children: '"Click to open"',
          },
        },
        Menu: {
          plumeType: "menu",
          props: {
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
      title: "Opened by default",
      info: "You can use defaultOpen to make a MenuButton open by default.",
      code: `
        const menu = <InstanceMenu />;
        return <InstanceButton />;
      `,
      instances: {
        Button: {
          props: {
            defaultOpen: "true",
            menu: "menu",
            children: '"Click to open"',
          },
        },
        Menu: {
          plumeType: "menu",
          props: {
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
  ],
  codeProps: [
    {
      name: "children",
      info: `Button label.`,
      type: "ReactNode",
    },
    {
      name: "menu",
      info: `Menu that opens when user clicks on the button`,
      type: (site: Site): string => {
        const tps = site.components
          .filter((c) => c.plumeInfo?.type === "menu")
          .map((c) => getExportedComponentName(c))
          .join(" | ");
        return `${tps} | (() => ${tps})`;
      },
    },
    {
      name: "isDisabled",
      info: `Disable button functionality.`,
      type: "boolean",
    },
    {
      name: "isOpen",
      info: `Whether the Select is currently open.`,
      type: "boolean",
    },
    {
      name: "onOpenChange",
      info: `Event handler fired when Select's open state changes.`,
      type: "(isOpen: boolean) => void",
    },
    {
      name: "defaultOpen",
      info: `Uncontrolled default open state.`,
      type: "boolean",
    },
    {
      name: "placement",
      info: `Desired placement location of the Select dropdown.`,
      type: `"bottom" | "bottom left" | "bottom right" | "bottom start" | "bottom end" | "top" | "top left" | "top right" | "top start" | "top end" | "left" | "left top" | "left bottom" | "start" | "start top" | "start bottom" | "right" | "right top" | "right bottom" | "end" | "end top" | "end bottom"`,
    },
    {
      name: "menuMatchTriggerWidth",
      info: `If true, menu width will always match the trigger button width. If false, then menu width will have min-width matching the trigger button width.`,
      type: "boolean",
    },
    {
      name: "menuWidth",
      info: "If set, menu width will be exactly this width, overriding menuMatchTriggerWidth.",
      type: "number",
    },
  ],
  reservedProps: ["children", ...RESERVED_PROPS],
  tagToAttachEventHandlers: "div",
};
