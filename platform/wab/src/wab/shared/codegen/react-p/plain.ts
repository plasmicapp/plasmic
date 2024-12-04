import { componentToReferenced } from "@/wab/shared/cached-selectors";
import {
  ComponentGenHelper,
  SiteGenHelper,
} from "@/wab/shared/codegen/codegen-helpers";
import {
  makeIconImports,
  makePictureImports,
} from "@/wab/shared/codegen/image-assets";
import { serializeDataReps } from "@/wab/shared/codegen/react-p/data-reps";
import { getUsedGlobalVariantGroups } from "@/wab/shared/codegen/react-p/global-variants";
import { optimizeGeneratedCodeForHostlessPackages } from "@/wab/shared/codegen/react-p/optimize-hostless-packages";
import { makePageMetadataOutput } from "@/wab/shared/codegen/react-p/page-metadata";
import {
  getArgParams,
  getGenableVariantGroups,
  serializeArgsDefaultValues,
  serializeArgsType,
  serializeVariantsArgsType,
} from "@/wab/shared/codegen/react-p/params";
import {
  asOneNode,
  getExportedComponentName,
  getHostNamedImportsForRender,
  getHostNamedImportsForSkeleton,
  getImportedComponentName,
  getNormalizedComponentName,
  getReactWebNamedImportsForRender,
  makeArgPropsName,
  makeArgsTypeName,
  makeCssFileName,
  makePlasmicComponentName,
  makePlasmicSuperContextName,
  makeStylesImports,
  makeVariantPropsName,
  makeVariantsArgTypeName,
  makeWabFlexContainerClassName,
  maybeCondExpr,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import { serializePlasmicSuperContext } from "@/wab/shared/codegen/react-p/super-context";
import { serializeTplTextBlockContent } from "@/wab/shared/codegen/react-p/text";
import {
  SerializerBaseContext,
  SerializerSiteContext,
} from "@/wab/shared/codegen/react-p/types";
import {
  deriveReactHookSpecs,
  generateReferencedImports,
  getOrderedExplicitVSettings,
  makeChildrenStr,
} from "@/wab/shared/codegen/react-p/utils";
import {
  ComponentExportOutput,
  ExportOpts,
  ProjectConfig,
} from "@/wab/shared/codegen/types";
import { jsLiteral } from "@/wab/shared/codegen/util";
import { makeGlobalVariantGroupImportTemplate } from "@/wab/shared/codegen/variants";
import {
  getParamNames,
  getSuperComponents,
  hasDataSourceInteractions,
  isCodeComponent,
  isPageComponent,
} from "@/wab/shared/core/components";
import {
  allImageAssets,
  allMixins,
  allStyleTokens,
} from "@/wab/shared/core/sites";
import { CssVarResolver } from "@/wab/shared/core/styles";
import {
  isTplComponent,
  isTplSlot,
  isTplTag,
  isTplTextBlock,
  summarizeTpl,
} from "@/wab/shared/core/tpls";
import { getProjectFlags } from "@/wab/shared/devflags";
import {
  Component,
  Site,
  TplComponent,
  TplNode,
  TplSlot,
  TplTag,
} from "@/wab/shared/model/classes";
import {
  PlumeType,
  getPlumeCodegenPlugin,
} from "@/wab/shared/plume/plume-registry";
import { makeVariantComboSorter } from "@/wab/shared/variant-sort";
import L from "lodash";
import {
  computeSerializerSiteContext,
  exportProjectConfig,
  makeNodeNamer,
  makeVariantComboChecker,
  maybeSerializeAsStringProp,
  renderPage,
  serializeComponentLocalVars,
  serializeCssRules,
  serializeDefaultExternalProps,
  serializeTplComponentBase,
  serializeTplSlotBase,
  serializeTplTagBase,
} from ".";

export const tplMarker = `/*__TPL_MARKER__*/`;

export function exportReactPlain(
  component: Component,
  site: Site,
  projectConfig: ProjectConfig,
  opts: ExportOpts = {
    lang: "ts",
    relPathFromImplToManagedDir: ".",
    relPathFromManagedToImplDir: ".",
    forceAllProps: false,
    forceRootDisabled: false,
    imageOpts: { scheme: "inlined" },
    stylesOpts: { scheme: "css" },
    codeOpts: { reactRuntime: "classic" },
    platform: "react",
    fontOpts: { scheme: "import" },
    codeComponentStubs: false,
    skinnyReactWeb: false,
    skinny: false,
    importHostFromReactWeb: true,
    hostLessComponentsConfig: "package",
    useComponentSubstitutionApi: false,
    useGlobalVariantsSubstitutionApi: false,
    useCodeComponentHelpersRegistry: false,
    useCustomFunctionsStub: false,
    targetEnv: "codegen",
  },
  siteCtx: SerializerSiteContext,
  extraOpts: Partial<SerializerBaseContext> = {}
): ComponentExportOutput {
  const { fakeTpls, replacedHostlessComponentImportPath } =
    optimizeGeneratedCodeForHostlessPackages(component, site, false);
  const nodeNamer = makeNodeNamer(component);
  const reactHookSpecs = deriveReactHookSpecs(component, nodeNamer);
  const projectFlags = getProjectFlags(site);
  // The array of global variants used for non css purpose, including visibility
  // change and text change.
  const usedGlobalVariantGroups = getUsedGlobalVariantGroups(
    site,
    component,
    projectFlags
  );
  const variantComboChecker = makeVariantComboChecker(
    component,
    reactHookSpecs,
    "triggers"
  );
  const siteHelper = new SiteGenHelper(site, false);
  const compHelper = new ComponentGenHelper(siteHelper, undefined);
  const ctx: SerializerBaseContext = {
    componentGenHelper: compHelper,
    component,
    nodeNamer,
    reactHookSpecs,
    site,
    siteCtx,
    projectConfig,
    usedGlobalVariantGroups,
    variantComboChecker,
    variantComboSorter: makeVariantComboSorter(site, component),
    exportOpts: {
      ...opts,
      stylesOpts: {
        ...opts.stylesOpts,
        // For plain export, always use css flex-gap so that each stack
        // doesn't become two separate divs
        useCssFlexGap: true,
      },
    },
    aliases: new Map(),
    ...extraOpts,
    s3ImageLinks: {},
    projectFlags,
    forceAllCsr: false,
    cssVarResolver: new CssVarResolver(
      allStyleTokens(site, { includeDeps: "all" }),
      allMixins(site, { includeDeps: "all" }),
      allImageAssets(site, { includeDeps: "all" }),
      site.activeTheme
    ),
    usesComponentLevelQueries:
      component.dataQueries.filter((q) => !!q.op).length > 0,
    usesDataSourceInteraction: hasDataSourceInteractions(component),
    cache: {},
    serializeTplNode,
    exprCtx: {
      projectFlags,
      component,
      inStudio: opts.isLivePreview,
    },
    fakeTpls,
    replacedHostlessComponentImportPath,
  };
  const componentName = getExportedComponentName(component);
  const root = component.tplTree;
  const vgs = getGenableVariantGroups(ctx);

  let renderBody = serializeTplNode(ctx, root);

  if (isPageComponent(component)) {
    renderBody = renderPage(ctx, component, renderBody);
  }

  if (component.subComps.length > 0) {
    renderBody = `
      <${makePlasmicSuperContextName(component)}.Provider value={{
        variants, args
      } as any}>
        ${renderBody}
      </${makePlasmicSuperContextName(component)}.Provider>
    `;
  }

  const referencedComponents = componentToReferenced(component);
  const referencedImports = generateReferencedImports(
    referencedComponents,
    opts,
    false,
    // We are importing from "impl", or, the "skeleton" files
    true,
    ctx.aliases
  );
  const iconImports = makeIconImports(
    site,
    component,
    ctx.exportOpts,
    "managed",
    ctx.aliases
  );
  const importGlobalVariantContexts =
    usedGlobalVariantGroups.size === 0
      ? ""
      : `
  ${[...usedGlobalVariantGroups]
    .map((vg) => makeGlobalVariantGroupImportTemplate(vg, ".", opts))
    .join("\n")}
`;

  const plumeType = component.plumeInfo?.type as PlumeType | undefined;
  const plumePlugin = getPlumeCodegenPlugin(component);
  const plumeImports = plumePlugin?.genSkeletonImports?.(ctx);
  const refName = plumeImports?.refName;
  const module = `
import * as React from "react";
import {
  ${getReactWebNamedImportsForRender()}
} from "@plasmicapp/react-web";
import {
  ${getHostNamedImportsForRender()}
  ${getHostNamedImportsForSkeleton()}
} from "@plasmicapp/react-web/lib/host";
${
  ctx.usesDataSourceInteraction || ctx.usesComponentLevelQueries
    ? `import { usePlasmicDataConfig, executePlasmicDataOp, usePlasmicDataOp } from "@plasmicapp/react-web/lib/data-sources";`
    : ""
}
${plumeType ? `import * as pp from "@plasmicapp/react-web";` : ""}
${plumeImports ? plumeImports.imports : ""}

${referencedImports.join("\n")}
${importGlobalVariantContexts}
${makeStylesImports(
  siteCtx.cssProjectDependencies,
  component,
  projectConfig,
  ctx.exportOpts,
  "plain"
)}
${iconImports}
${makePictureImports(site, component, ctx.exportOpts, "managed")}

${getSuperComponents(component)
  .map(
    (superComp) => `
import SUPER__${makePlasmicComponentName(
      superComp
    )} from "./${getExportedComponentName(superComp)}"; // plasmic-import: ${
      superComp.uuid
    }/component`
  )
  .join("\n")}

${serializeComponentPropsType(ctx)}

${serializePlasmicSuperContext(ctx)}

${
  plumePlugin
    ? // Fake Plasmic* component to be used in useBehavior()
      `
const ${makePlasmicComponentName(component)} = Object.assign(
  {} as any as ((props: {
    variants?: ${makeVariantsArgTypeName(component)};
    args?: ${makeArgsTypeName(component)};
    overrides?: any
  }) => React.ReactElement),
  {
    internalVariantProps: ${makeVariantPropsName(component)},
    internalArgProps: ${makeArgPropsName(component)},
  }
);
`
    : ""
}

${plumePlugin?.genHook(ctx) ?? ""}

function ${componentName}_(props: ${makeComponentPropsTypeName(component)}${
    refName ? `, ref: ${refName}` : ""
  }) {
  ${
    plumePlugin
      ? `
    const { plasmicProps: plumeProps } = useBehavior(props, ref);

  `
      : ""
  }

  ${
    ctx.projectFlags.usePlasmicTranslation
      ? `const $translator = usePlasmicTranslator?.();`
      : ""
  }

  const variants = {
    ...pick(props, ...${jsLiteral(
      getParamNames(
        component,
        vgs.map((vg) => vg.param)
      )
    )}),
    ${plumePlugin ? "...plumeProps.variants" : ""}
  };
  const args = {
    ...${serializeArgsDefaultValues(ctx)},
    ...pick(props, ...${jsLiteral(
      getParamNames(component, getArgParams(ctx))
    )}),
    ${plumePlugin ? "...plumeProps.args" : ""}
  };

  ${serializeComponentLocalVars(ctx)}

  return (
    ${renderBody}
  );
}

const ${componentName} = ${
    refName ? `React.forwardRef(${componentName}_)` : `${componentName}_`
  };

${
  plumePlugin
    ? `
export default Object.assign(
  ${componentName},
  ${plumePlugin.genSerializedSkeletonFields(ctx)}
  ${
    component.subComps.length > 0
      ? `
  , {
    Context: ${makePlasmicSuperContextName(component)}
  }
  `
      : ""
  }
);
`
    : `
export default ${componentName};
`
}

  `;

  return {
    scheme: "plain",
    id: component.uuid,
    componentName: getExportedComponentName(component),
    plasmicName: getNormalizedComponentName(component),
    displayName: component.name,
    skeletonModule: module,
    renderModule: "",
    skeletonModuleFileName: `${getExportedComponentName(component)}.tsx`,
    renderModuleFileName: "",
    cssRules: serializeCssRules(ctx),
    cssFileName: makeCssFileName(getExportedComponentName(component), opts),
    isPage: isPageComponent(component),
    isGlobalContextProvider: component.codeComponentMeta?.isContext ?? false,
    plumeType: component.plumeInfo?.type,
    metadata: component.metadata,
    isCode: isCodeComponent(component),
    path: component.pageMeta?.path,
    ...(isPageComponent(component) && {
      pageMetadata: makePageMetadataOutput(ctx),
    }),
    nameInIdToUuid: {},
  };
}

function serializeComponentPropsType(ctx: SerializerBaseContext) {
  const { component } = ctx;
  return `
${serializeVariantsArgsType(ctx)}
${serializeArgsType(ctx)}
${serializeDefaultExternalProps(ctx, {
  typeName: makeComponentPropsTypeName(component),
})}
  `;
}

function serializeTplNode(ctx: SerializerBaseContext, node: TplNode): string {
  function serialize() {
    if (isTplTag(node)) {
      return serializeTplTag(ctx, node);
    } else if (isTplComponent(node)) {
      return serializeTplComponent(ctx, node);
    } else if (isTplSlot(node)) {
      return serializeTplSlot(ctx, node);
    } else {
      throw new Error(`Unexpected TplNode ${summarizeTpl(node)}`);
    }
  }

  return ctx.markTpl === node
    ? `${tplMarker}${serialize()}${tplMarker}`
    : serialize();
}

function serializeTplTag(ctx: SerializerBaseContext, node: TplTag) {
  const plumePlugin = getPlumeCodegenPlugin(ctx.component);
  const nodeName = ctx.nodeNamer(node);
  const orderedVsettings = getOrderedExplicitVSettings(ctx, node);

  let children: string[];
  if (isTplTextBlock(node)) {
    children = [
      serializeTplTextBlockContent(ctx, node, orderedVsettings).value,
    ];
  } else {
    children = serializeTplNodesAsArray(ctx, node.children);
  }

  const { wrapFlexChild, attrs, orderedCondStr, tag, triggeredHooks } =
    serializeTplTagBase(ctx, node, {
      additionalClassExprs:
        node === ctx.component.tplTree ? [`props.className`] : undefined,
    });

  const hasGap = wrapFlexChild && wrapFlexChild !== "false";

  const tagType = tag;

  if (nodeName) {
    attrs["data-plasmic-name"] = jsLiteral(nodeName);
  }

  const hasPlumeOverride = !!nodeName && !!plumePlugin?.genHook;
  if (hasPlumeOverride) {
    attrs["data-plasmic-override"] = `plumeProps.overrides[${jsLiteral(
      nodeName
    )}]`;
  }
  const triggerPropNames = L.uniq(
    triggeredHooks.flatMap((spec) => spec.getTriggerPropNames())
  );
  if (hasGap) {
    // Instead of using p.Stack, we directly generate the div
    // wrapper to lessen dependency on @plasmicapp/react-web
    children = [
      makeElement(
        "div",
        {
          className: jsLiteral(makeWabFlexContainerClassName(ctx.exportOpts)),
        },
        children,
        {
          isTag: true,
        }
      ),
    ];
  }
  const jsx = makeElement(tagType, attrs, children, {
    isTag: !tagType.includes(".") && tagType[0].toUpperCase() !== tagType[0],
    useProxy: hasPlumeOverride,
    spreadProps: triggerPropNames,
  });
  const serializedRepped = serializeDataReps(ctx, node, jsx);
  return maybeCondExpr(orderedCondStr, serializedRepped);
}

function makeElement(
  tagType: string,
  serializedProps: Record<string, string>,
  serializedChildren: string[],
  opts: {
    spreadProps?: string[];
    useProxy?: boolean;
    isTag?: boolean;
  }
) {
  const hasChildren = serializedChildren.length > 0;
  if (opts.useProxy) {
    return `<>{createPlasmicElementProxy(
      ${opts.isTag ? jsLiteral(tagType) : tagType},
      {
        ${Object.entries(serializedProps)
          .map(([key, val]) => {
            if (key.startsWith("data-plasmic-")) {
              return `...{${jsLiteral(key)}: ${val}} as any`;
            } else {
              return `${jsLiteral(key)}: ${val}`;
            }
          })
          .join(",\n")}
      },
      ${serializedChildren.join(", ")}
    )}</>`;
  } else {
    return `
  <${tagType}
    ${Object.entries(serializedProps)
      .map(([attr, val]) => `${attr}={${val}}`)
      .join("\n")}
    ${
      opts.spreadProps
        ? opts.spreadProps.map((p) => `{...${p}}`).join("\n")
        : ""
    }
    ${
      hasChildren
        ? `>
          ${makeChildrenStr(serializedChildren)}
        </${tagType}>`
        : `/>`
    }
    `;
  }
}

function serializeTplComponent(ctx: SerializerBaseContext, node: TplComponent) {
  const plumePlugin = getPlumeCodegenPlugin(ctx.component);
  const nodeName = ctx.nodeNamer(node);
  const { orderedCondStr, attrs, serializedChildren } =
    serializeTplComponentBase(ctx, node, {
      additionalClassExpr:
        node === ctx.component.tplTree ? [`props.className`] : undefined,
    });

  if (nodeName) {
    attrs["data-plasmic-name"] = jsLiteral(nodeName);
  }
  const hasPlumeOverride = !!nodeName && !!plumePlugin?.genHook;
  if (hasPlumeOverride) {
    attrs["data-plasmic-override"] = `plumeProps.overrides[${jsLiteral(
      nodeName
    )}]`;
  }
  const jsx = makeElement(
    getImportedComponentName(ctx.aliases, node.component),
    attrs,
    serializedChildren,
    {
      useProxy: hasPlumeOverride,
    }
  );

  return maybeCondExpr(orderedCondStr, jsx);
}

function serializeTplSlotArgsAsArray(
  ctx: SerializerBaseContext,
  nodes: TplNode[]
) {
  // If possible to serialize as a string prop, do so
  const asStringProp = maybeSerializeAsStringProp(ctx, nodes);
  if (asStringProp !== undefined) {
    return asStringProp;
  }

  // Otherwise, serialize nodes as usual
  return serializeTplNodesAsArray(ctx, nodes);
}

function serializeTplSlot(ctx: SerializerBaseContext, node: TplSlot) {
  const { orderedCondStr, argValue, slotClassName, fallback } =
    serializeTplSlotBase(ctx, node);

  const serializedFallback = asOneNode(
    serializeTplSlotArgsAsArray(ctx, fallback)
  );

  const serializedSlot = `renderPlasmicSlot({
    defaultContents: ${serializedFallback},
    value: ${argValue},
    ${slotClassName ? `className: ${slotClassName}` : ""}
  })`;

  return maybeCondExpr(orderedCondStr, serializedSlot);
}

function serializeTplNodesAsArray(
  ctx: SerializerBaseContext,
  nodes: TplNode[]
): string[] {
  return nodes.map((child) => serializeTplNode(ctx, child));
}

function makeComponentPropsTypeName(component: Component) {
  return `${getExportedComponentName(component)}Props`;
}

export function exportReactPlainTypical(
  project: Site,
  projectName: string,
  projectId: string,
  component: Component,
  extraOpts?: Partial<SerializerBaseContext>
) {
  const exportOpts: ExportOpts = {
    lang: "ts",
    platform: "react",
    imageOpts: {
      scheme: "files",
    },
    stylesOpts: {
      scheme: "css-modules",
    },
    codeOpts: {
      reactRuntime: "classic",
    },
    fontOpts: {
      scheme: "import",
    },
    codeComponentStubs: false,
    skinnyReactWeb: false,
    skinny: false,
    importHostFromReactWeb: true,
    hostLessComponentsConfig: "package",
    useComponentSubstitutionApi: false,
    useGlobalVariantsSubstitutionApi: false,
    useCodeComponentHelpersRegistry: false,
    relPathFromImplToManagedDir: ".",
    relPathFromManagedToImplDir: ".",
    useCustomFunctionsStub: false,
    targetEnv: "codegen",
  };
  const projectConfig = exportProjectConfig(
    project,
    projectName,
    projectId,
    0,
    "",
    "latest",
    exportOpts
  );
  const { skeletonModule } = exportReactPlain(
    component,
    project,
    projectConfig,
    exportOpts,
    computeSerializerSiteContext(project),
    extraOpts
  );
  return skeletonModule;
}
