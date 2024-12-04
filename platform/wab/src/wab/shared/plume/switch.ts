import { getTplSlotByName } from "@/wab/shared/SlotUtils";
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
  createDefaultSlotContentsStub,
  ensureValidPlumeCodeMeta,
  makeComponentImportPath,
  maybeIncludeSerializedDefaultSlotContent,
  serializeComponentSubstitutionCallsForDefaultContents,
} from "@/wab/shared/plume/plume-utils";
import type { SwitchRef } from "@plasmicapp/react-web";
import { omit, pick } from "lodash";
import type React from "react";

const RESERVED_PROPS = [
  "noLabel",
  "isChecked",
  "isDisabled",
  "children",
  "name",
  "value",
];

const switchConfig = {
  isCheckedVariant: { group: "isChecked", variant: "isChecked" },
  isDisabledVariant: { group: "isDisabled", variant: "isDisabled" },
  noLabelVariant: { group: "noLabel", variant: "noLabel" },
  labelSlot: "children",
  root: "root",
};

export const SwitchPlugin: PlumePlugin = {
  // PlumeCanvasPlugin
  genCanvasWrapperComponent: (sub, impl, observer, getCompMeta, component) => {
    const Comp = sub.React.forwardRef((allProps, ref: SwitchRef) =>
      observer(() => {
        const internalProps = pick(allProps, internalCanvasElementProps);
        let usingDefaultChildren: false | React.ReactElement = false;
        let componentProps = omit(allProps, internalCanvasElementProps);
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
        const { plasmicProps } = sub.reactWeb.useSwitch(
          Object.assign(impl, getCompMeta()),
          componentProps,
          switchConfig as any,
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
    (Comp as any).__plasmicFormFieldValueProp = "isChecked";
    return Comp;
  },

  // PlumeCodegenPlugin
  genHook(ctx: SerializerBaseContext) {
    const { component } = ctx;
    return `
      function useBehavior<P extends pp.SwitchProps>(props: P, ref: pp.SwitchRef) {
        ${serializeComponentSubstitutionCallsForDefaultContents(ctx, [
          "children",
        ])}
        ${maybeIncludeSerializedDefaultSlotContent(ctx, "children")}
        return pp.useSwitch<P, typeof ${makePlasmicComponentName(component)}>(
          ${makePlasmicComponentName(component)},
          props,
          ${jsLiteral(switchConfig)},
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
      } extends pp.SwitchProps {
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

      function ${componentName}_(props: ${propsName}, ref: SwitchRef) {
        const { plasmicProps, state } = ${plasmicComponentName}.useBehavior<${propsName}>(props, ref);
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
        __plumeType: "switch",
        __plasmicFormFieldMeta: { valueProp: "isChecked" },
      }`;
  },
  genSkeletonImports(ctx) {
    return {
      imports: `
        import {SwitchRef} from "${getPlumePackageName(
          ctx.exportOpts,
          "switch"
        )}";`,
      refName: "SwitchRef",
    };
  },

  // PlumeEditorPlugin
  shouldShowInstanceProp(tpl: TplComponent | null, prop: Param) {
    return !["noLabel"].includes(toVarName(prop.variable.name));
  },

  codeComponentMeta: (comp) =>
    ensureValidPlumeCodeMeta(comp, {
      props: {
        name: {
          type: "string",
          hidden: (ps: any) => !!ps.__plasmicFormField,
        },
        isChecked: {
          type: "boolean",
          hidden: (ps: any) => !!ps.__plasmicFormField,
        },
        value: {
          type: "string",
          advanced: true,
        },
        "aria-label": {
          type: "string",
          advanced: true,
        },
        "aria-labelledby": {
          type: "string",
          advanced: true,
        },
        onChange: {
          type: "eventHandler",
          argTypes: [{ name: "isChecked", type: "boolean" }],
        } as any,
        children: {
          type: "slot",
          ...({
            mergeWithParent: true,
          } as any),
        },
      },

      states: {
        isChecked: {
          type: "writable",
          valueProp: "isChecked",
          onChangeProp: "onChange",
          variableType: "boolean",
          hidden: (ps: any) => !!ps.__plasmicFormField,
        },
      },
    }),

  componentMeta: {
    name: "Switch",
    description: "Can be toggled on or off.",
    variantDefs: [
      {
        group: "isChecked",
        variant: "isChecked",
        info: `Shows the Switch when it is "checked".`,
        required: true,
      },
      {
        group: "noLabel",
        variant: "noLabel",
        info: `Shows the Switch without a label.`,
        required: true,
      },
      {
        group: "isDisabled",
        variant: "isDisabled",
        info: `Shows the Switch in a disabled state.`,
        required: true,
      },
    ],
    slotDefs: [
      {
        name: "children",
        info: `Slot for the label of the Switch.`,
        required: true,
      },
    ],
    elementDefs: [
      {
        name: "root",
        info: `Root element of the Switch.`,
        required: true,
      },
    ],
  },

  // PlumeDocsPlugin
  docsInfo:
    "This is a special component that renders a Switch with behavior and accessibility.",
  examples: [
    {
      title: "Controlled Switch",
      info: "You can use isChecked/onChange to control your Switch component.",
      code: `
        const [checked, setChecked] = React.useState(false);
        return <InstanceSwitch />;
      `,
      instances: {
        Switch: {
          props: {
            isChecked: "checked",
            onChange: "(checked) => setChecked(checked)",
            children: '"Controlled switch"',
          },
        },
      },
    },
    {
      title: "Uncontrolled Switch",
      info: "You can make an uncontrolled switch by not specifying isChecked/onChange props.",
      code: `
        const ref = React.useRef<HTMLFormElement>(null);
        const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const obj = {};
          (new FormData(ref.current)).forEach((v, k) => obj[k] = v);
          console.log("Form data", obj);
        };
        return (
          <form onSubmit={onSubmit} ref={ref}>
            <InstanceSwitch />
            <br />
            <button type="submit">Submit</button>
          </form>
        );
      `,
      instances: {
        Switch: {
          props: {
            name: '"foo"',
            value: '"bar"',
            children: '"Uncontrolled switch"',
          },
        },
      },
    },
    {
      title: "Switch with no label",
      info: "If you don't specify children, the switch will have no visible label.",
      code: `
        return <InstanceSwitch />;
      `,
      instances: {
        Switch: {
          props: {
            "aria-label": '"Hidden label for accessibility"',
          },
        },
      },
    },
    {
      title: "Disabled Switch",
      info: "Use isDisabled to render a switch that can't be toggled.",
      code: `
        return <InstanceSwitch />;
      `,
      instances: {
        Switch: {
          props: {
            isDisabled: "true",
          },
        },
      },
    },
  ],
  codeProps: [
    {
      name: "isChecked",
      info: `Controlled switch state.`,
      type: "boolean",
    },
    {
      name: "onChange",
      info: `Callback whenever checked state changes.`,
      type: "(val: boolean) => void",
    },
    {
      name: "defaultChecked",
      info: `Set default state for uncontrolled switch.`,
      type: "boolean",
    },
    {
      name: "isDisabled",
      info: `Disable switch toggling.`,
      type: "boolean",
    },
    {
      name: "children",
      info: `Switch label.`,
      type: "ReactNode",
    },
    {
      name: "name",
      info: `Switch name field.`,
      type: "string",
    },
    {
      name: "value",
      info: `Switch value field.`,
      type: "string",
    },
  ],
  reservedProps: RESERVED_PROPS,
};
