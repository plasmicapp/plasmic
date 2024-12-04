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
import type { CheckboxRef } from "@plasmicapp/react-web";
import { omit, pick } from "lodash";
import type React from "react";

const RESERVED_PROPS = [
  "noLabel",
  "isChecked",
  "isIndeterminate",
  "isDisabled",
  "children",
  "name",
  "value",
];

const checkboxConfig = {
  isCheckedVariant: { group: "isChecked", variant: "isChecked" },
  isIndeterminateVariant: {
    group: "isIndeterminate",
    variant: "isIndeterminate",
  },
  isDisabledVariant: { group: "isDisabled", variant: "isDisabled" },
  noLabelVariant: { group: "noLabel", variant: "noLabel" },
  labelSlot: "children",
  root: "root",
} as const;

export const CheckboxPlugin: PlumePlugin = {
  // PlumeCanvasPlugin
  genCanvasWrapperComponent: (sub, impl, observer, getCompMeta, component) => {
    const Comp = sub.React.forwardRef((allProps, ref: CheckboxRef) =>
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
        const { plasmicProps } = sub.reactWeb.useCheckbox(
          Object.assign(impl, getCompMeta()),
          componentProps,
          checkboxConfig as any,
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
      function useBehavior<P extends pp.CheckboxProps>(props: P, ref: pp.CheckboxRef) {
        ${serializeComponentSubstitutionCallsForDefaultContents(ctx, [
          "children",
        ])}
        ${maybeIncludeSerializedDefaultSlotContent(ctx, "children")}
        return pp.useCheckbox<P, typeof ${makePlasmicComponentName(component)}>(
          ${makePlasmicComponentName(component)},
          props,
          ${jsLiteral(checkboxConfig)},
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
      } extends pp.CheckboxProps {
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

      function ${componentName}_(props: ${propsName}, ref: CheckboxRef) {
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
      __plumeType: "checkbox",
      __plasmicFormFieldMeta: { valueProp: "isChecked" },
    }
    `;
  },
  genSkeletonImports(ctx) {
    return {
      imports: `
      import {CheckboxRef} from "${getPlumePackageName(
        ctx.exportOpts,
        "checkbox"
      )}";`,
      refName: "CheckboxRef",
    };
  },
  twiddleGenInstanceProps(_tpl: TplComponent, _attrs) {},

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
    name: "Checkbox",
    description: "Can be toggled on or off, or show an indeterminate state.",
    variantDefs: [
      {
        group: "isChecked",
        variant: "isChecked",
        info: `Shows the Checkbox when it is "checked".`,
        required: true,
      },
      {
        group: "isIndeterminate",
        variant: "isIndeterminate",
        info: `Shows the Checkbox when it is "indeterminate". Typically, this is useful for a "Check all" checkbox that checks and unchecks a group of other Checkboxes; if some of those Checkboxes are checked and some are not, you can show this Checkbox state as "indeterminate".`,
        required: true,
      },
      {
        group: "noLabel",
        variant: "noLabel",
        info: `Shows the Checkbox without a label.`,
        required: true,
      },
      {
        group: "isDisabled",
        variant: "isDisabled",
        info: `Shows the Checkbox in a disabled state.`,
        required: true,
      },
    ],
    slotDefs: [
      {
        name: "children",
        info: `Slot for the label of the Checkbox.`,
        required: true,
      },
    ],
    elementDefs: [
      {
        name: "root",
        info: `Root element of the Checkbox.`,
        required: true,
      },
    ],
  },

  // PlumeDocsPlugin
  docsInfo:
    "This is a special component that renders a Checkbox with behavior and accessibility.",
  examples: [
    {
      title: "Controlled Checkbox",
      info: "You can use isChecked/onChange to control your checkbox component.",
      code: `
        const [checked, setChecked] = React.useState(false);
        return <InstanceCheckbox />;
      `,
      instances: {
        Checkbox: {
          props: {
            isChecked: "checked",
            onChange: "(checked) => setChecked(checked)",
            children: '"Controlled checkbox"',
          },
        },
      },
    },
    {
      title: "Uncontrolled Checkbox",
      info: "You can make an uncontrolled checkbox by not specifying isChecked/onChange props.",
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
            <InstanceCheckbox />
            <br />
            <button type="submit">Submit</button>
          </form>
        );
      `,
      instances: {
        Checkbox: {
          props: {
            name: '"foo"',
            value: '"bar"',
            children: '"Uncontrolled checkbox"',
          },
        },
      },
    },
    {
      title: "Checkbox with no label",
      info: "If you don't specify children, the checkbox will have no visible label.",
      code: `
        return <InstanceCheckbox />;
      `,
      instances: {
        Checkbox: {
          props: {
            "aria-label": '"Hidden label for accessibility"',
          },
        },
      },
    },
    {
      title: "Disabled checkbox",
      info: "Use isDisabled to render a checkbox that can't be toggled.",
      code: `
        return <InstanceCheckbox />;
      `,
      instances: {
        Checkbox: {
          props: {
            isDisabled: "true",
            children: '"Disabled checkbox"',
          },
        },
      },
    },
    {
      title: "Indeterminate state",
      info: `You can use isIndeterminate to render the checkbox in an indeterminate state.`,
      code: `
        const checkboxes = ["Red", "Green", "Blue"];
        const [allChecked, setAllChecked] = React.useState(false);
        const [indeterminate, setIndeterminate] = React.useState(false);
        const [checked, setChecked] = React.useState(checkboxes.map(() => false));

        React.useEffect(() => {
          const allChecked = checked.every((c) => c)
          setAllChecked(allChecked);
          setIndeterminate(!allChecked && checked.some((c) => c))
        }, [checked]);

        const onChange = (idx: number) => (value: boolean) => {
          const newChecked = [...checked];
          newChecked[idx] = value;
          setChecked(newChecked);
        };

        const onChangeAll = () => {
          setChecked(checkboxes.map(() => !allChecked && !indeterminate));
        };

        return (
          <div>
            <div>
              <InstanceAll />
            </div>
            <hr />
            <div>
              {checkboxes.map((color, i) => (
                <div key={i}>
                  <InstanceSingle />
                </div>
              ))}
            </div>
          </div>
        );
      `,
      instances: {
        All: {
          props: {
            isChecked: "allChecked",
            isIndeterminate: "indeterminate",
            onChange: "onChangeAll",
            children:
              'allChecked || indeterminate ? "Uncheck all" : "Check all"',
          },
        },
        Single: {
          props: {
            isChecked: "checked[i]",
            onChange: "onChange(i)",
            children: "color",
          },
        },
      },
    },
  ],
  codeProps: [
    {
      name: "isChecked",
      info: `Controlled checkbox state.`,
      type: "boolean",
    },
    {
      name: "onChange",
      info: `Callback whenever checked state changes.`,
      type: "(val: boolean) => void",
    },
    {
      name: "defaultChecked",
      info: `Set default state for uncontrolled checkbox.`,
      type: "boolean",
    },
    {
      name: "isIndeterminate",
      info: `Display checkbox in indeterminate state.`,
      type: "boolean",
    },
    {
      name: "isDisabled",
      info: `Disable checkbox toggling.`,
      type: "boolean",
    },
    {
      name: "children",
      info: `Checkbox label.`,
      type: "ReactNode",
    },
    {
      name: "name",
      info: `Checkbox name field.`,
      type: "string",
    },
    {
      name: "value",
      info: `Checkbox value field.`,
      type: "string",
    },
  ],
  reservedProps: RESERVED_PROPS,
};
