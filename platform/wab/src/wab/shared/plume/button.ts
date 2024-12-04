import { internalCanvasElementProps } from "@/wab/shared/canvas-constants";
import {
  getExternalParams,
  serializeParamType,
} from "@/wab/shared/codegen/react-p/params";
import {
  getExportedComponentName,
  isPageAwarePlatform,
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
import { metaSvc } from "@/wab/shared/core/metas";
import { PlumePlugin } from "@/wab/shared/plume/plume-registry";
import {
  ensureValidPlumeCodeMeta,
  makeComponentImportPath,
} from "@/wab/shared/plume/plume-utils";
import type { ButtonRef } from "@plasmicapp/react-web";
import { omit, pick } from "lodash";

const RESERVED_PROPS = [
  "startIcon",
  "endIcon",
  "children",
  "showStartIcon",
  "showEndIcon",
  "isDisabled",
  "link",
];

const buttonConfig = {
  showStartIconVariant: { group: "showStartIcon", variant: "showStartIcon" },
  showEndIconVariant: { group: "showEndIcon", variant: "showEndIcon" },
  isDisabledVariant: { group: "isDisabled", variant: "isDisabled" },
  contentSlot: "children",
  startIconSlot: "startIcon",
  endIconSlot: "endIcon",
  root: "root",
} as const;

export const ButtonPlugin: PlumePlugin = {
  // PlumeCanvasPlugin
  genCanvasWrapperComponent: (sub, comp, observer, getCompMeta) => {
    return sub.React.forwardRef((allProps, ref: ButtonRef) =>
      observer(() => {
        const internalProps = pick(allProps, internalCanvasElementProps);
        const { plasmicProps } = sub.reactWeb.useButton(
          Object.assign(comp, getCompMeta()),
          omit(allProps, internalCanvasElementProps),
          buttonConfig as any,
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
    const plasmicLinkOverride = isPageAwarePlatform(ctx.exportOpts.platform)
      ? `if (b.plasmicProps.overrides.root.as === "a") {
        b.plasmicProps.overrides.root.as = PlasmicLink__;
        b.plasmicProps.overrides.root.props.component = Link;
        b.plasmicProps.overrides.root.props.platform = "${ctx.exportOpts.platform}";
      }`
      : "";
    return `
      function useBehavior<P extends pp.PlumeButtonProps>(props: P, ref: pp.ButtonRef) {
        const b = pp.useButton<P, typeof ${makePlasmicComponentName(
          component
        )}>(
          ${makePlasmicComponentName(component)},
          props,
          ${jsLiteral(buttonConfig)},
          ref
        );
        ${plasmicLinkOverride}
        return b;
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
      } extends pp.BaseButtonProps {
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

      function ${componentName}_(props: ${propsName}, ref: ButtonRef) {
        const { plasmicProps } = ${plasmicComponentName}.useBehavior<${propsName}>(props, ref);
        return <${plasmicComponentName} {...plasmicProps} />;
      }

      export type ButtonComponentType = {
        (props: Omit<${propsName}, HtmlAnchorOnlyProps> & {ref?: React.Ref<HTMLButtonElement>}): React.ReactElement;
        (props: Omit<${propsName}, HtmlButtonOnlyProps> & {ref?: React.Ref<HTMLAnchorElement>}): React.ReactElement;
      };
      const ${componentName} = React.forwardRef(${componentName}_) as any as ButtonComponentType;

      export default Object.assign(
        ${componentName},
        ${this.genSerializedSkeletonFields(ctx)}
      );
    `;
  },
  genSerializedSkeletonFields(ctx) {
    return `{ __plumeType: "button" }`;
  },
  genSkeletonImports(ctx) {
    return {
      imports: `

      import {ButtonRef, HtmlAnchorOnlyProps, HtmlButtonOnlyProps} from "${getPlumePackageName(
        ctx.exportOpts,
        "button"
      )}";
      `,
      refName: "ButtonRef",
    };
  },
  codeComponentMeta: (comp) =>
    ensureValidPlumeCodeMeta(comp, {
      props: {
        submitsForm: {
          type: "boolean",
          displayName: "Submits form?",
          defaultValueHint: false,
          advanced: true,
          description:
            "Whether clicking on this button submits the enclosing form or not",
          hidden: (ps) => !!ps.link,
        },
        target: {
          type: "boolean",
          displayName: "Open in new tab?",
          defaultValueHint: false,
          hidden: (ps) => !ps.link,
        },
        children: {
          type: "slot",
          ...({
            mergeWithParent: true,
          } as any),
        },
      },
      ...({ trapsSelection: true } as any),
    }),

  componentMeta: {
    name: "Button",
    description: "Can be used either as a clickable button or a link",
    variantDefs: [
      {
        group: "showStartIcon",
        variant: "showStartIcon",
        info: `Shows an icon at the start of the Button.`,
        required: false,
      },
      {
        group: "showEndIcon",
        variant: "showEndIcon",
        info: `Shows an icon at the end of the Button.`,
        required: false,
      },
      {
        group: "isDisabled",
        variant: "isDisabled",
        info: `Shows the Button in a disabled state.`,
        required: true,
      },
    ],
    slotDefs: [
      {
        name: "children",
        info: `Slot for the content of the Button.`,
        required: true,
      },
      {
        name: "startIcon",
        info: `Slot for the icon to show at the start of the Button.`,
        required: false,
      },
      {
        name: "endIcon",
        info: `Slot for the icon to show at the end of the Button.`,
        required: false,
      },
    ],
    elementDefs: [
      {
        name: "root",
        info: `Root element of the Button.`,
        required: true,
      },
    ],
  },

  getEventHandlers: () => metaSvc.eventHandlersForTag("button"),

  // PlumeDocsPlugin
  docsInfo:
    "This is a special component that renders a Button that can be used as either a clickable button or a link.",
  examples: [
    {
      title: "As a clickable button",
      info: "You can attach the usual <button/> props and use this component as a button",
      code: `
        return <InstanceButton />;
      `,
      instances: {
        Button: {
          props: {
            onClick: `() => alert("You got me!")`,
            children: `"Click me?"`,
          },
        },
      },
    },
    {
      title: "As a link",
      info: `You can use this component as a link by passing in a "link" prop with the destination`,
      code: `
        return <InstanceButton />;
      `,
      instances: {
        Button: {
          props: {
            link: `"https://www.plasmic.app"`,
            target: `"_blank"`,
            children: `"Check out Plasmic!"`,
          },
        },
      },
    },
    {
      title: "Use some icons",
      info: `You can show start and end icons for a button`,
      code: `
        return <InstanceButton />;
      `,
      instances: {
        Button: {
          props: {
            showStartIcon: `true`,
            showEndIcon: `true`,
          },
        },
      },
    },
  ],
  codeProps: [
    {
      name: "link",
      info: `If specified, will render the button as an html anchor link with this value as the href`,
      type: "string",
    },
    {
      name: "startIcon",
      info: `Icon to show at the start of the button. Will only be shown if showStartIcon is true.`,
      type: "ReactNode",
    },
    {
      name: "endIcon",
      info: `Icon to show at the end of the button. Will only be shown if showEndIcon is true.`,
      type: "ReactNode",
    },
    {
      name: "children",
      info: `Main content of the button`,
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
  ],
  reservedProps: RESERVED_PROPS,
  tagToAttachEventHandlers: "button",
};
