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
import { getInputTypeOptions } from "@/wab/shared/html-utils";
import { TplComponent } from "@/wab/shared/model/classes";
import { PlumePlugin } from "@/wab/shared/plume/plume-registry";
import {
  ensureValidPlumeCodeMeta,
  makeComponentImportPath,
} from "@/wab/shared/plume/plume-utils";
import type { TextInputRef } from "@plasmicapp/react-web";
import { omit, pick } from "lodash";

const RESERVED_PROPS = [
  "startIcon",
  "endIcon",
  "showStartIcon",
  "showEndIcon",
  "isDisabled",
];

const textInputConfig = {
  showStartIconVariant: { group: "showStartIcon", variant: "showStartIcon" },
  showEndIconVariant: { group: "showEndIcon", variant: "showEndIcon" },
  isDisabledVariant: { group: "isDisabled", variant: "isDisabled" },
  startIconSlot: "startIcon",
  endIconSlot: "endIcon",
  root: "root",
  input: "input",
} as const;

export const TextInputPlugin: PlumePlugin = {
  // PlumeCanvasPlugin
  genCanvasWrapperComponent: (sub, comp, observer, getCompMeta) => {
    return sub.React.forwardRef((allProps, ref: TextInputRef) =>
      observer(() => {
        const internalProps = pick(allProps, internalCanvasElementProps);
        const { plasmicProps } = sub.reactWeb.useTextInput(
          Object.assign(comp, getCompMeta()),
          omit(allProps, internalCanvasElementProps),
          textInputConfig as any,
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
      function useBehavior<P extends pp.PlumeTextInputProps>(props: P, ref: pp.TextInputRef) {
        return pp.useTextInput<P, typeof ${makePlasmicComponentName(
          component
        )}>(
          ${makePlasmicComponentName(component)},
          props,
          ${jsLiteral(textInputConfig)},
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
      } extends pp.BaseTextInputProps {
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

      function ${componentName}_(props: ${propsName}, ref: TextInputRef) {
        const { plasmicProps } = ${plasmicComponentName}.useBehavior<${propsName}>(props, ref);
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
        __plumeType: "text-input"
      }`;
  },
  genSkeletonImports(ctx) {
    return {
      imports: `
        import {TextInputRef} from "${getPlumePackageName(
          ctx.exportOpts,
          "text-input"
        )}";`,
      refName: "TextInputRef",
    };
  },

  twiddleGenInstanceProps(_tpl: TplComponent, _attrs) {},

  componentMeta: {
    name: "TextInput",
    description: "A text input control that can show start and end icons.",
    variantDefs: [
      {
        group: "showStartIcon",
        variant: "showStartIcon",
        info: `Shows an icon at the start of the text input.`,
        required: false,
      },
      {
        group: "showEndIcon",
        variant: "showEndIcon",
        info: `Shows an icon at the end of the text input.`,
        required: false,
      },
      {
        group: "isDisabled",
        variant: "isDisabled",
        info: `Shows the text input in a disabled state.`,
        required: true,
      },
    ],
    slotDefs: [
      {
        name: "startIcon",
        info: `Slot for the icon to show at the start of the text input.`,
        required: false,
      },
      {
        name: "endIcon",
        info: `Slot for the icon to show at the end of the text input.`,
        required: false,
      },
    ],
    elementDefs: [
      {
        name: "root",
        info: `Root element of the text input.`,
        required: true,
      },
      {
        name: "input",
        info: `The actual <input/> form element.`,
        required: true,
      },
    ],
  },

  codeComponentMeta: (comp) =>
    ensureValidPlumeCodeMeta(comp, {
      props: {
        value: {
          type: "string",
          defaultValue: "",
          hidden: (ps: any) => !!ps.__plasmicFormField,
        },
        name: {
          type: "string",
          hidden: (ps: any) => !!ps.__plasmicFormField,
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
          // TODO: would be nice to reuse the machinery Samuel set up for
          // getting React event types here
          argTypes: [{ name: "event", type: "object" }],
        } as any,
        type: {
          type: "choice",
          options: getInputTypeOptions("text"),
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
      ...({
        trapsSelection: true,
      } as any),
    }),
  // PlumeDocsPlugin
  docsInfo:
    "This is a form component for receiving text input.  You can use it the same way as a normal html <input/>.",
  examples: [
    {
      title: "Controlled TextInput",
      info: "You can control value from your component",
      code: `
        const [value, setValue] = React.useState(undefined);
        return <InstanceTextInput />;
      `,
      instances: {
        TextInput: {
          props: {
            value: "value",
            onChange: "(event) => setValue(event.target.value)",
          },
        },
      },
    },
    {
      title: "Uncontrolled TextInput",
      info: "You can make an uncontrolled TextInput by not specifying value/onChange props.",
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
            <InstanceTextInput />
            <br />
            <button type="submit">Submit</button>
          </form>
        );
      `,
      instances: {
        TextInput: {
          props: {
            name: '"foo"',
          },
        },
      },
    },
    {
      title: "TextInput with icons",
      info: "You can show and hide start and end icons",
      code: `
        return <InstanceTextInput />;
      `,
      instances: {
        TextInput: {
          props: {
            showStartIcon: "true",
            showEndIcon: "true",
          },
        },
      },
    },
  ],
  reservedProps: RESERVED_PROPS,
  codeProps: [
    {
      name: "startIcon",
      info: `Icon to show at the start of the input. Will only be shown if showStartIcon is true.`,
      type: "ReactNode",
    },
    {
      name: "endIcon",
      info: `Icon to show at the end of the input. Will only be shown if showEndIcon is true.`,
      type: "ReactNode",
    },
    {
      name: "showStartIcon",
      info: `If true, shows the icon passed as startIcon prop`,
      type: "boolean",
    },
    {
      name: "showEndIcon",
      info: `If true, shows the icon passed as endIcon prop`,
      type: "boolean",
    },
    {
      name: "isDisabled",
      info: `Renders the button as disabled`,
      type: "boolean",
    },
    {
      name: "value",
      info: "Value for the TextInput; for controlled usage",
      type: "string",
    },
    {
      name: "onChange",
      info: "Callback whenever value changes",
      type: "(val: React.ChangeEventHandler<HTMLInputElement>) => void",
    },
    {
      name: "defaultValue",
      info: "Default value for TextInput for uncontrolled usage.",
      type: "string",
    },
    {
      name: "name",
      info: "TextInput form name",
      type: "string",
    },
    {
      name: "placeholder",
      info: "Placeholder text to show when the input is empty",
      type: "string",
    },
  ],
  footer:
    'This component also takes all the usual props for HTML inputs, except "disabled" (you should use "isDisabled" instead).',
  genOnChangeEventToValue: "(e) => e.target?.value",
};
