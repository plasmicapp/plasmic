import { getTplComponentArg, setTplComponentArg } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import { ensureBaseVariantSetting } from "@/wab/shared/Variants";
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
import {
  generateSubstituteComponentCalls,
  getPlumePackageName,
  makeComponentImportName,
} from "@/wab/shared/codegen/react-p/utils";
import {
  jsLiteral,
  paramToVarName,
  toVarName,
} from "@/wab/shared/codegen/util";
import { ensure, withoutNils } from "@/wab/shared/common";
import { codeLit } from "@/wab/shared/core/exprs";
import {
  Component,
  Param,
  TplComponent,
  isKnownVirtualRenderExpr,
} from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import { PlumePlugin } from "@/wab/shared/plume/plume-registry";
import {
  ensureValidPlumeCodeMeta,
  isPlumeTypeElement,
  makeComponentImportPath,
  maybeIncludeSerializedDefaultSlotContent,
  traverseReactEltTree,
} from "@/wab/shared/plume/plume-utils";
import type { SelectRef } from "@plasmicapp/react-web";
import { omit, pick } from "lodash";
import { computedFn } from "mobx-utils";
import type React from "react";

const RESERVED_PROPS = [
  "isOpen",
  "showPlaceholder",
  "isDisabled",
  "selectedContent",
  "children",
  "placeholder",
  "value",
  "name",
];

const selectConfig = {
  isOpenVariant: { group: "isOpen", variant: "isOpen" },
  placeholderVariant: { group: "showPlaceholder", variant: "showPlaceholder" },
  isDisabledVariant: { group: "isDisabled", variant: "isDisabled" },
  triggerContentSlot: "selectedContent",
  optionsSlot: "children",
  placeholderSlot: "placeholder",
  root: "root",
  trigger: "trigger",
  overlay: "overlay",
  optionsContainer: "optionsContainer",
} as const;

interface CanvasSelectedValueState {
  selectedValue: string;
}

export const mkCanvasSelectedValueState = computedFn(
  function mkCanvasSelectState(react: typeof React) {
    return react.createContext<undefined | CanvasSelectedValueState>(undefined);
  }
);

export const mkCanvasIsFirstGroupState = computedFn(
  function mkCanvasSelectState(react: typeof React) {
    return react.createContext<boolean>(false);
  }
);

export const SelectPlugin: PlumePlugin = {
  // PlumeCanvasPlugin
  genCanvasWrapperComponent: (
    sub,
    comp,
    observer,
    getCompMeta,
    _component,
    _viewCtx,
    createCanvasComponent
  ) => {
    return sub.React.forwardRef((allProps, ref: SelectRef) =>
      observer(() => {
        // Avoid using the very error-prone selectedContent prop
        const props = omit(allProps, "selectedContent");

        const optionComponent = _component.subComps.find(
          (c) => c.plumeInfo?.type === "select-option"
        )!;
        const optionGroupComponent = _component.subComps.find(
          (c) => c.plumeInfo?.type === "select-option-group"
        )!;
        const internalProps = pick(props, internalCanvasElementProps);
        const { plasmicProps } = sub.reactWeb.useSelect(
          Object.assign(comp, getCompMeta()),
          omit(props, internalCanvasElementProps),
          {
            ...selectConfig,
            OptionComponent: createCanvasComponent(optionComponent),
            OptionGroupComponent: createCanvasComponent(optionGroupComponent),
          } as any,
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
    const optionSubComp = ensure(
      component.subComps.find(
        (comp) => comp.plumeInfo?.type === "select-option"
      ),
      "Expected to find select-option subComponent"
    );
    const optionGroupSubComp = ensure(
      component.subComps.find(
        (comp) => comp.plumeInfo?.type === "select-option-group"
      ),
      "Expected to find select-option-group subComponent"
    );
    return `
      function useBehavior<P extends pp.BaseSelectProps>(props: P, ref: pp.SelectRef) {
        ${
          ctx.exportOpts.useComponentSubstitutionApi
            ? // If we're using substitution, then we can't just reference the
              // subcomponents by their imported name; we reference them as
              // getPlasmicComponent__Select__Option() etc.  So we make
              // those calls here
              generateSubstituteComponentCalls(
                [optionSubComp, optionGroupSubComp],
                ctx.exportOpts,
                ctx.aliases
              ).join("\n")
            : ""
        }
        if (!("options" in props)) {
          ${maybeIncludeSerializedDefaultSlotContent(ctx, "children")}
        }
        return pp.useSelect(
          ${makePlasmicComponentName(component)},
          props,
          {
            ...${jsLiteral(selectConfig)},
            OptionComponent: ${getImportedComponentName(
              ctx.aliases,
              optionSubComp
            )},\
            OptionGroupComponent: ${getImportedComponentName(
              ctx.aliases,
              optionGroupSubComp
            )},
          },
          ref
        );
      }
    `;
  },
  genDefaultExternalProps(ctx, opts) {
    const { component } = ctx;
    const params = getExternalParams(ctx).filter(
      (p) => !RESERVED_PROPS.includes(toVarName(p.variable.name))
    );
    return `
      export interface ${
        opts?.typeName ?? makeDefaultExternalPropsName(component)
      } extends pp.BaseSelectProps {
        ${params
          // We exclude onChange here, as we just inherit the onChange prop
          // with better types from pp.BaseSelectProps
          .filter((p) => paramToVarName(ctx.component, p) !== "onChange")
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
    const skeletonImports = this.genSkeletonImports(ctx);
    const optionSubComp = ensure(
      component.subComps.find(
        (comp) => comp.plumeInfo?.type === "select-option"
      ),
      "Expected to find select-option subComponent"
    );
    const optionGroupSubComp = ensure(
      component.subComps.find(
        (comp) => comp.plumeInfo?.type === "select-option-group"
      ),
      "Expected to find select-option-group subComponent"
    );
    const componentSubstitutionApi = ctx.exportOpts.useComponentSubstitutionApi
      ? `import { components } from "@plasmicapp/loader-runtime-registry";

    export function getPlasmicComponent() {
      return components["${component.uuid}"] ?? ${componentName};
    }`
      : "";
    const subCompReferences = ctx.exportOpts.useComponentSubstitutionApi
      ? generateSubstituteComponentCalls(
          [optionSubComp, optionGroupSubComp],
          ctx.exportOpts,
          ctx.aliases
        )
      : [];
    return `
      import * as React from "react";
      import {${plasmicComponentName}, ${defaultPropsName}} from "${
      ctx.exportOpts.relPathFromImplToManagedDir
    }/${makeComponentImportPath(
      component,
      ctx,
      "render"
    )}";  // plasmic-import: ${component.uuid}/render
      ${skeletonImports.imports}

      ${componentSubstitutionApi}
      ${subCompReferences.join("\n")}

      export interface ${propsName} extends ${defaultPropsName} {
        // Feel free to add any additional props that this component should receive
      }

      function ${componentName}_(props: ${propsName}, ref: SelectRef) {
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

  genSerializedSkeletonFields(ctx: SerializerBaseContext) {
    const { component } = ctx;
    const optionSubComp = ensure(
      component.subComps.find(
        (comp) => comp.plumeInfo?.type === "select-option"
      ),
      "Expected to find select-option subComponent"
    );
    const optionGroupSubComp = ensure(
      component.subComps.find(
        (comp) => comp.plumeInfo?.type === "select-option-group"
      ),
      "Expected to find select-option-group subComponent"
    );
    return `
      {
        Option: ${getImportedComponentName(ctx.aliases, optionSubComp)},
        OptionGroup: ${getImportedComponentName(
          ctx.aliases,
          optionGroupSubComp
        )},
        __plumeType: "select"
      }
    `;
  },

  genSkeletonImports(ctx: SerializerBaseContext) {
    const { component } = ctx;
    const optionSubComp = ensure(
      component.subComps.find(
        (comp) => comp.plumeInfo?.type === "select-option"
      ),
      "Expected to find select-option subComponent"
    );
    const optionGroupSubComp = ensure(
      component.subComps.find(
        (comp) => comp.plumeInfo?.type === "select-option-group"
      ),
      "Expected to find select-option-group subComponent"
    );

    return {
      imports: `
        import {SelectRef} from "${getPlumePackageName(
          ctx.exportOpts,
          "select"
        )}";
        import ${makeComponentImportName(
          optionSubComp,
          ctx.aliases,
          ctx.exportOpts
        )} from "./${makeComponentImportPath(
        optionSubComp,
        ctx,
        "skeleton"
      )}";  // plasmic-import: ${optionSubComp.uuid}/component
        import ${makeComponentImportName(
          optionGroupSubComp,
          ctx.aliases,
          ctx.exportOpts
        )} from "./${makeComponentImportPath(
        optionGroupSubComp,
        ctx,
        "skeleton"
      )}";  // plasmic-import: ${optionGroupSubComp.uuid}/component
      `,
      refName: "SelectRef",
    };
  },

  twiddleGenInstanceProps(tpl: TplComponent, attrs) {
    // Never set isOpen
    delete attrs["isOpen"];

    // Never set selectedContent; should only be used if using the Select component
    // directly from code.
    delete attrs["selectedContent"];
  },

  //
  // PlumeEditorPlugin
  //
  codeComponentMeta: (comp) =>
    ensureValidPlumeCodeMeta(comp, {
      props: {
        value: {
          type: "choice",
          displayName: "Selected",
          options: (ps: any) => getSelectOptionsFromProps(ps),
          hidden: (ps: any) => !!ps.__plasmicFormField,
        },
        options: {
          type: "array",
          displayName: "Options",
          itemType: {
            type: "object",
            nameFunc: (item: any) => item?.label ?? item?.value,
            fields: {
              value: {
                type: "string",
                displayName: "Value",
                description:
                  "Value that identifies this option. Will also be the value shown to the user, unless you specify a Label.",
              },
              label: {
                type: "string",
                displayName: "Label",
                description:
                  "If you want to show a different value to the user than the Value, you can optionally specify a label.",
                advanced: true,
              },
              isDisabled: {
                type: "boolean",
                displayName: "Disabled?",
                defaultValueHint: false,
                advanced: true,
              },
            },
          },
          hidden: (ps) => !!ps.children,
          exprHint:
            'An array of items, like `["Option1", "Option2"]`, or an array of objects with `value`, `label`, or `isDisabled`, like `[{value: "usa", label: "United States"}, {value: "bra", label: "Brazil"}]`',
        },
        name: {
          type: "string",
          displayName: "Name",
          description: "The HTML name of the select",
          hidden: (ps: any) => !!ps.__plasmicFormField,
        },
        onChange: {
          type: "eventHandler",
          argTypes: [{ name: "value", type: "string" }],
          advanced: true,
        } as any,
        "aria-label": {
          type: "string",
          description: "The ARIA label for this select",
          advanced: true,
        },
        "aria-labelledby": {
          type: "string",
          description: "Identifies the element(s) that labels this select",
          advanced: true,
        },
      },
      states: {
        value: {
          type: "writable",
          valueProp: "value",
          onChangeProp: "onChange",
          variableType: "text",
          hidden: (ps: any) => !!ps.__plasmicFormField,
        },
      },
    }),

  shouldShowInstanceProp(tpl: TplComponent | null, prop: Param) {
    const varName = toVarName(prop.variable.name);
    if (["showPlaceholder", "selectedContent"].includes(varName)) {
      return false;
    }

    if (varName === "children") {
      // Only show `children` slot if no `options` are set
      const hasOptions = tpl?.vsettings.some((vs) =>
        vs.args.some((arg) => arg.param.variable.name === "options")
      );
      if (hasOptions) {
        return false;
      }
    }
    return true;
  },

  getSlotType(component: Component, param: Param) {
    if (param.variable.name === "children") {
      const option = component.subComps.find(
        (c) => c.plumeInfo?.type === "select-option"
      );
      const group = component.subComps.find(
        (c) => c.plumeInfo?.type === "select-option-group"
      );
      return typeFactory.renderable({
        params: withoutNils([
          option ? typeFactory.instance(option) : undefined,
          group ? typeFactory.instance(group) : undefined,
        ]),
        allowRootWrapper: undefined,
      });
    }

    return undefined;
  },

  onAttached(tpl) {
    // This is always tripping people up, so removing it entirely
    $$$(tpl).delSlotArg("selectedContent");
    const childrenArg = $$$(tpl).getSlotArg("children");

    if (childrenArg && !isKnownVirtualRenderExpr(childrenArg.expr)) {
      // We are attaching a Select instance that's really using the
      // `children` arg, likely copy and pasted from somewhere.
      // So we keep it as is
      return;
    }

    // Otherwise, clear the children arg in favor of using options arg
    $$$(tpl).delSlotArg("children");

    const optionsParam = tpl.component.params.find(
      (p) => p.variable.name === "options"
    );
    if (optionsParam) {
      const baseVs = ensureBaseVariantSetting(tpl);
      const arg = getTplComponentArg(tpl, baseVs, optionsParam.variable);
      if (!arg) {
        // If no options has been set, then we initialize it with some.
        // We are not using param.defaultExpr, because it has the annoying
        // property that it is _always_ used whenever an arg is unset,
        // so if the user intended to use `children` and clear the `options`
        // prop, the defaultExpr for options will still be used!
        setTplComponentArg(
          tpl,
          baseVs,
          optionsParam.variable,
          codeLit([
            { value: "option1", label: "Option 1" },
            { value: "option2", label: "Option 2" },
          ])
        );
      }
    }
  },

  getArtboardRootDefaultProps(component) {
    const optionsParam = component.params.find(
      (p) => p.variable.name === "options"
    );
    if (!optionsParam || optionsParam.defaultExpr) {
      return undefined;
    }
    return {
      options: [
        { value: "option1", label: "Option 1" },
        { value: "option2", label: "Option 2" },
      ],
    };
  },

  componentMeta: {
    name: "Select",
    description: `Shows a list of options in a dropdown menu. Supports selecting zero or one option at a time.`,
    variantDefs: [
      {
        group: "isOpen",
        variant: "isOpen",
        info: `Renders the Select in "open" state, where the dropdown menu is shown.`,
        required: true,
      },
      {
        group: "showPlaceholder",
        variant: "showPlaceholder",
        info: `Renders the Select in "empty" state, where nothing has been selected, and placeholder is shown.`,
        required: true,
      },
      {
        group: "isDisabled",
        variant: "isDisabled",
        info: `Renders the Select in "disabled" state; the user cannot interact with the Select in this state.`,
        required: true,
      },
    ],
    slotDefs: [
      {
        name: "children",
        info: `Slot in the dropdown menu showing the Options for this Select.`,
        required: true,
      },
      {
        name: "selectedContent",
        info: `Slot in the trigger button showing the currently-selected option.`,
        required: true,
      },
      {
        name: "placeholder",
        info: `Slot in the trigger button showing the placeholder content if nothing is selected.`,
        required: true,
      },
    ],
    elementDefs: [
      {
        name: "root",
        info: "The root element of the Select, containing the trigger button and the driopdown menu.",
        required: true,
      },
      {
        name: "trigger",
        info: `The trigger button of the Select, which displays the currently-selected option or the placeholder. Clicking on this button will show the dropdown menu.`,
        required: true,
      },
      {
        name: "overlay",
        info: "The dropdown menu overlay of the Select; will be absolutely positioned relative to the trigger when the Select is opened.  If you want the overlay to be offset from the trigger, specify a margin.",
        required: true,
      },
      {
        name: "optionsContainer",
        info: `The container for Select options; it should be inside the "overlay" element, immediately wrapping the "children" slot.  If your Select dropdown should be scrollable if not enough space, you should set overflow to scroll on this element.`,
        required: true,
      },
    ],
  },

  // PlumeDocsPlugin
  docsInfo:
    "This is a special component that renders a Select with behavior and accessibility.",
  subs: {
    "select-option": "Option",
    "select-option-group": "OptionGroup",
  },
  examples: [
    {
      title: "Basic usage",
      info: "Specify your options either as an array of strings or objects.  Options can be disabled.",
      code: `
        const [person, setPerson] = React.useState(null);
        const [country, setCountry] = React.useState(null);
        return (
          <div>
            <InstanceSelect />
            <InstanceSelect2 />
          </div>
        )
        return
      `,
      instances: {
        Select: {
          props: {
            "aria-label": '"Select a person"',
            onChange: "setPerson",
            placeholder: '"Select a name..."',
            value: "person",
            options: JSON.stringify(["Alice", "Bob", "Eve"]),
          },
        },
        Select2: {
          props: {
            "aria-label": '"Select a country"',
            onChange: "setCountry",
            placeholder: '"Select a country..."',
            value: "country",
            options: JSON.stringify([
              { value: "usa", label: "United States" },
              { value: "bra", label: "Brazil" },
              { value: "can", label: "Canada", isDisabled: true },
            ]),
          },
        },
      },
    },
    {
      title: "Usage with `children`",
      info: "You can use the `children` prop instead of `options` to give yourself more control over how the options are rendered.",
      code: `
        const colors = ["red", "green", "blue"];
        const [value, setValue] = React.useState("red");
        return <InstanceSelect />
      `,
      instances: {
        Select: {
          props: {
            "aria-label": '"Select a color"',
            onChange: "setValue",
            value: "value",
            children: "colors.map(color => <InstanceOption />)",
          },
        },
        Option: {
          plumeType: "select-option",
          props: {
            value: "color",
            children:
              "<div style={{ color }}>{color} <small>(color)</small></div>",
          },
        },
      },
    },
    {
      title: "Uncontrolled Select",
      info: "You can make an uncontrolled Select by not specifying value/onChange props.",
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
            <InstanceSelect />
            <br />
            <button type="submit">Submit</button>
          </form>
        );
      `,
      instances: {
        Select: {
          props: {
            "aria-label": '"Select a fruit"',
            defaultValue: '"apple"',
            name: '"fruit"',
            options: JSON.stringify([
              { value: "apple", label: "Apple" },
              { value: "banana", label: "Banana" },
              { value: "coconut", label: "Coconut" },
            ]),
          },
        },
      },
    },
    {
      title: "Opened by default",
      info: "You can use defaultOpen to make a Select open by default.",
      code: `
        return <InstanceSelect />;
      `,
      instances: {
        Select: {
          props: {
            "aria-label": '"Select a name"',
            defaultOpen: "true",
            children: "<><InstanceOptionA /><InstanceOptionB /></>",
          },
        },
        OptionA: {
          plumeType: "select-option",
          props: {
            children: '"Alice"',
          },
        },
        OptionB: {
          plumeType: "select-option",
          props: {
            children: '"Bob"',
          },
        },
      },
    },
    {
      title: 'Controlled "open" state',
      info: "You can use isOpen/onOpenChange to control the Select open state. In this example we don't provide onOpenChange, so the only way to open/close the options is by clicking in a custom button.",
      code: `
        const [isOpen, setIsOpen] = React.useState(false);
        return (
          <div>
            <button onClick={() => setIsOpen(!isOpen)}>Toggle isOpen</button>
            <InstanceSelect />
          </div>
        );
      `,
      instances: {
        Select: {
          props: {
            "aria-label": '"Select a name"',
            isOpen: "isOpen",
            children: "<><InstanceOptionA /><InstanceOptionB /></>",
          },
        },
        OptionA: {
          plumeType: "select-option",
          props: {
            children: '"Alice"',
          },
        },
        OptionB: {
          plumeType: "select-option",
          props: {
            children: '"Bob"',
          },
        },
      },
    },
    {
      title: "Using Option Groups",
      info: "You can group options either with `children` or `options`",
      code: `
        return (
          <div>
            <InstanceSelect />
            <InstanceSelect2 />
          </div>
        )
      `,
      instances: {
        Select: {
          props: {
            "aria-label": '"Select thing"',
            options: JSON.stringify([
              { title: "Names", children: ["Alice", "Bob", "Charles"] },
              { title: "Fruits", children: ["Apple", "Banana", "Coconut"] },
            ]),
          },
        },
        Select2: {
          props: {
            "aria-label": '"Label for accessibility"',
            children: "<><InstanceNames /><InstanceFruits /></>",
          },
        },
        Names: {
          plumeType: "select-option-group",
          props: {
            title: '"Names"',
            children:
              "<><InstanceAlice /><InstanceBob /><InstanceCharles /></>",
          },
        },
        Fruits: {
          plumeType: "select-option-group",
          props: {
            title: '"Fruits"',
            children:
              "<><InstanceApple /><InstanceBanana /><InstanceCoconut /></>",
          },
        },
        Alice: {
          plumeType: "select-option",
          props: {
            children: '"Alice"',
          },
        },
        Bob: {
          plumeType: "select-option",
          props: {
            children: '"Bob"',
          },
        },
        Charles: {
          plumeType: "select-option",
          props: {
            children: '"Charles"',
          },
        },
        Apple: {
          plumeType: "select-option",
          props: {
            children: '"Apple"',
          },
        },
        Banana: {
          plumeType: "select-option",
          props: {
            children: '"Banana"',
          },
        },
        Coconut: {
          plumeType: "select-option",
          props: {
            children: '"Coconut"',
          },
        },
      },
    },
  ],
  codeProps: [
    {
      name: "value",
      info: `Value of the current selected option.`,
      type: "string | null",
    },
    {
      name: "onChange",
      info: `Event handler fired when currently selected value changes.`,
      type: "(val: string | null) => void",
    },
    {
      name: "defaultValue",
      info: `Default value for uncontrolled Select.`,
      type: "string",
    },
    {
      name: "options",
      info: `List of options as an array. It can either be an array of strings, or an array of objects with fields value, label, and isDisabled. Takes precedence over children prop.`,
      type: "string[] | {value: string, label?: string, isDisabled?: boolean}[]",
    },
    {
      name: "children",
      info: `List of options.`,
      type: "Option[]",
    },
    {
      name: "name",
      info: `Select name field.`,
      type: "string",
    },
    {
      name: "placeholder",
      info: `Placeholder.`,
      type: "ReactNode",
    },
    {
      name: "isDisabled",
      info: `Disable Select functionality.`,
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
  reservedProps: RESERVED_PROPS,
  footer:
    "This component also takes the following HTML Select props: id, ARIA labeling props (aria-label, aria-labelledby, aria-describedby, aria-details), excludeFromTabOrder, isReadOnly, autoFocus, className, style.",
};

function getSelectOptionsFromProps(props: any) {
  const options = new Set<string>();
  if ("options" in props) {
    const rec = (item: any) => {
      if (!item) {
        return;
      }
      if (typeof item === "string") {
        options.add(item);
      } else if ("children" in item && Array.isArray(item.children)) {
        item.children.forEach(rec);
      } else if (item.value) {
        options.add(item.value);
      }
    };
    props.options?.forEach(rec);
  } else {
    const children = props.children;
    traverseReactEltTree(children, (elt) => {
      if (isPlumeTypeElement(elt, "select-option")) {
        options.add(elt.props.value ?? "");
      }
    });
  }
  return Array.from(options.keys());
}
