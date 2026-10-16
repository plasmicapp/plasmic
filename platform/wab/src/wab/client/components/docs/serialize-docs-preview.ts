import { CodePreviewCtx } from "@/wab/client/components/docs/CodePreviewSnippet";
import {
  DocsPortalCtx,
  IconToggleProp,
} from "@/wab/client/components/docs/DocsPortalCtx";
import { buildDocsPreviewModules } from "@/wab/client/components/live/preview-codegen";
import { syncPreview } from "@/wab/client/components/live/preview-sync";
import { isStandaloneVariantGroup } from "@/wab/shared/Variants";
import { componentToDeepReferenced } from "@/wab/shared/cached-selectors";
import {
  makeAssetClassName,
  makeIconAssetFileNameWithoutExt,
} from "@/wab/shared/codegen/image-assets";
import {
  getNamedDescendantNodes,
  makeNodeNamer,
} from "@/wab/shared/codegen/react-p";
import {
  getExportedComponentName,
  makeAssetIdFileName,
  makeComponentRenderIdFileName,
  makeComponentSkeletonIdFileName,
  makeGlobalGroupImports,
  makePlasmicComponentName,
  wrapGlobalProvider,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import { ProjectConfig } from "@/wab/shared/codegen/types";
import { jsLiteral, toVarName } from "@/wab/shared/codegen/util";
import { assert, ensure, removeAt } from "@/wab/shared/common";
import {
  getSubComponents,
  isPlumeComponent,
} from "@/wab/shared/core/components";
import { getDependenciesWithReferencedCss } from "@/wab/shared/core/project-deps";
import {
  Component,
  ImageAsset,
  Param,
  Site,
  Variant,
  VariantGroup,
  isKnownImageAssetRef,
} from "@/wab/shared/model/classes";
import { getPlumeDocsPlugin } from "@/wab/shared/plume/plume-registry";
import generate from "@babel/generator";
import * as parser from "@babel/parser";
import * as t from "@babel/types";
import L from "lodash";
import * as printerEstree from "prettier/plugins/estree";
import * as parserTypescript from "prettier/plugins/typescript";
import * as Prettier from "prettier/standalone";

/**
 * Syncs current state DocsPortalCtx -- focused component and configured
 * toggles or custom code -- to the preview frame
 */
export function syncDocsPreview(
  docsCtx: DocsPortalCtx,
  doc: Document,
  opts: {
    onRendered: () => void;
    onError?: (error: Error) => void;
    codePreviewCtx?: CodePreviewCtx;
  },
) {
  const { onRendered, onError, codePreviewCtx } = opts;

  return syncPreview(
    ensure(doc.defaultView, "docs preview frame has a window"),
    () => buildDocsPreviewUpdate(docsCtx, codePreviewCtx),
    (error) => (error ? onError?.(error as Error) : onRendered()),
    { name: "DocsPreviewCanvas.syncPreview" },
  );
}

export function buildDocsPreviewUpdate(
  docsCtx: DocsPortalCtx,
  codePreviewCtx?: CodePreviewCtx,
) {
  if (!docsCtx.tryGetFocusedComponent() && !docsCtx.tryGetFocusedIcon()) {
    return undefined;
  }
  const { modules, globalGroups, depsProjectConfigs } =
    serializeDependentModules(docsCtx);
  const entry = createPreviewModule(
    docsCtx,
    globalGroups,
    depsProjectConfigs,
    codePreviewCtx,
  );
  modules.push(entry);
  return { modules, render: { run: entry.name } };
}

export function serializeDependentModules(docsCtx: DocsPortalCtx) {
  return buildDocsPreviewModules(
    docsCtx.studioCtx,
    docsCtx.tryGetFocusedComponent(),
    docsCtx.studioCtx.appCtx.appConfig.usePlasmicImg,
  );
}

export function depsForComponent(
  site: Site,
  component: Component,
): Set<Component> {
  const set = new Set<Component>();
  for (const sub of getSubComponents(component)) {
    set.add(sub);
  }

  const plugin = getPlumeDocsPlugin(component);
  if (!plugin || !plugin.deps) {
    return set;
  }

  const deps = site.components.filter(
    (c) => c.plumeInfo && plugin.deps?.includes(c.plumeInfo.type),
  );

  for (const dep of deps) {
    set.add(dep);
    for (const element of depsForComponent(site, dep)) {
      set.add(element);
    }
  }

  return set;
}

export function makePlumeDepsImports(site: Site, component: Component): string {
  const idFileNames = true;
  return [...depsForComponent(site, component).values()]
    .map((comp) => getExportedComponentName(comp))
    .map(
      (className) =>
        `import ${className} from "./${
          idFileNames ? makeComponentSkeletonIdFileName(component) : className
        }";`,
    )
    .join("\n");
}

function makeComponentsMap(
  site: Site,
  component: Component,
  useSkeleton: boolean,
) {
  const components = [component, ...depsForComponent(site, component)];

  return (
    `const componentsMap = {\n` +
    components
      .map(
        (c) =>
          `"${c.name}": ${
            useSkeleton
              ? getExportedComponentName(c)
              : makePlasmicComponentName(c)
          }`,
      )
      .join(",\n") +
    `\n};`
  );
}

/**
 * Import statements for the project CSS of the dependencies whose tokens,
 * mixins, or animations the component references, so those vars resolve even
 * when no component from the dependency is rendered.
 */
function serializeReferencedDepCssImports(
  site: Site,
  component: Component,
  depsProjectConfigs: ProjectConfig[],
): string {
  const referencedDepIds = new Set(
    getDependenciesWithReferencedCss(site, [
      ...componentToDeepReferenced(component, true),
    ]).map((dep) => dep.projectId),
  );
  return depsProjectConfigs
    .filter((cfg) => referencedDepIds.has(cfg.projectId))
    .map((cfg) => `import "./${cfg.cssFileName}";`)
    .join("\n");
}

/**
 * Serialize the actual preview module -- the "root" of the preview react
 * app, and the module that instantiates the focused component.
 */
function createPreviewModule(
  docsCtx: DocsPortalCtx,
  globalGroups: VariantGroup[],
  depsProjectConfigs: ProjectConfig[],
  codePreviewCtx: CodePreviewCtx | undefined,
) {
  const component = docsCtx.tryGetFocusedComponent();
  const icon = docsCtx.tryGetFocusedIcon();
  assert(component || icon, "must have one or the other");

  const useSkeleton = (component && isPlumeComponent(component)) || false;
  const idFileNames = true;

  const className = useSkeleton
    ? getExportedComponentName(ensure(component, "picked component"))
    : component
      ? makePlasmicComponentName(component)
      : makeAssetClassName(ensure(icon, "picked icon"));

  const getComponentFilename = (c: Component): string => {
    if (idFileNames) {
      return useSkeleton
        ? makeComponentSkeletonIdFileName(c)
        : makeComponentRenderIdFileName(c);
    }
    return className;
  };

  const getIconFilename = (i: ImageAsset): string => {
    if (idFileNames) {
      return makeAssetIdFileName(i);
    }
    return makeIconAssetFileNameWithoutExt(i);
  };

  const importedFileName = component
    ? getComponentFilename(component)
    : getIconFilename(ensure(icon, "picked icon"));

  let content = component
    ? (docsCtx.getComponentCustomCode(component) ??
      serializeToggledComponent(
        component,
        docsCtx.getComponentToggles(component),
        docsCtx.useLoader(),
      ))
    : (docsCtx.getIconCustomCode(ensure(icon, "picked icon")) ??
      serializeToggledIcon(
        ensure(icon, "picked icon"),
        docsCtx.getIconToggles(ensure(icon, "picked icon")),
        docsCtx.useLoader(),
      ));

  const depCssImports = component
    ? serializeReferencedDepCssImports(
        docsCtx.studioCtx.site,
        component,
        depsProjectConfigs,
      )
    : "";

  let before = "";
  if (codePreviewCtx) {
    before = codePreviewCtx.getCode();
    content = "<App />";
  }

  // Wrap content in necessary global variant context providers
  for (const globalGroup of globalGroups) {
    content = wrapGlobalProvider(globalGroup, content, true, []);
  }

  return {
    name: `./script_${(component || ensure(icon, "picked icon")).uuid}_${
      codePreviewCtx?.uuid
    }.tsx`,
    lang: "tsx",
    source: `
import React from "react";
import ReactDOM from "react-dom";
${depCssImports}
import ${className} from "./${importedFileName}";
${component ? makePlumeDepsImports(docsCtx.studioCtx.site, component) : ""}
${makeGlobalGroupImports(globalGroups, { idFileNames: true })}

${
  component
    ? makeComponentsMap(docsCtx.studioCtx.site, component, useSkeleton)
    : ""
}
function PlasmicComponent({component, componentProps}) {
  return React.createElement(componentsMap[component], componentProps);
}

PlasmicComponent.getPlumeType = function({ component }) {
  return componentsMap[component].__plumeType;
}

export function __run() {
  try {
    ReactDOM.unmountComponentAtNode(document.getElementById("plasmic-app"));
  } catch {
    // Swallow errors when unmounting
  }

  document.body.style.overflow = "auto";

  ${before}
  return window.__plasmicLive.renderRoot(${content}).then(() => {
    for (const link of document.links) {
      if (link.href !== undefined) {
        link.href = "#";
      }
    }
  });
}
    `,
  };
}

type ComponentPropType =
  "plasmicIntrinsic" | "variant" | "arg" | "override" | "rootProp";
const intrinsicProps = ["variants", "args", "overrides"];

function variantAndArgNamesForComponent(component: Component) {
  return [...component.params.map((param) => toVarName(param.variable.name))];
}

export function resolveCollisionsForComponentProp(
  component: Component,
  key: string,
  kind: ComponentPropType,
) {
  let path: string[] = [];
  const maybeResolveCollision = (higherPriorityProps: string[]) => {
    const kindProp = `${kind}s`;
    if (kindProp && higherPriorityProps.includes(key)) {
      path = [kindProp, key];
    } else {
      path = [key];
    }
  };
  switch (kind) {
    case "plasmicIntrinsic":
      path = [key];
      break;
    case "variant":
    case "arg":
      maybeResolveCollision(intrinsicProps);
      break;
    case "override":
      maybeResolveCollision([
        ...intrinsicProps,
        ...variantAndArgNamesForComponent(component),
      ]);
      break;
    case "rootProp": {
      const nodeNamer = makeNodeNamer(component);
      const rootName = ensure(
        nodeNamer(component.tplTree),
        "must have roo t name",
      );
      const paramLevelPriorityProps = [
        ...intrinsicProps,
        ...variantAndArgNamesForComponent(component),
      ];
      const higherPriorityProps = [
        ...paramLevelPriorityProps,
        ...getNamedDescendantNodes(nodeNamer, component.tplTree).map((node) =>
          ensure(nodeNamer(node), "must have name"),
        ),
      ];
      if (!higherPriorityProps.includes(key)) {
        // Best case: we can do, for instance, <PlasmicComponent onClick={...}/>
        path = [key];
      } else if (!paramLevelPriorityProps.includes(rootName)) {
        // No variant/slot is named root: we do <PlasmicComponent root={{props: {onClick: ...}}}/>
        path = [rootName, "props", key];
      } else {
        // We need to do <PlasmicComponent overrides={{root: {props: {onClick: ...}}}}/>
        path = ["overrides", rootName, "props", key];
      }
      break;
    }
  }

  assert(path.length !== 0, "must have path");
  return path;
}

function serializeObjectChain(path: string[], serializedValue: string) {
  if (path.length === 0) {
    return serializedValue;
  }
  return `{${path[0]}: ${serializeObjectChain(
    path.slice(1),
    serializedValue,
  )}}`;
}

// Returns true if the node became empty after a deletion, so that parent
// nodes might also be deleted
function recursiveUpdateNode(
  node: t.ObjectExpression | t.JSXOpeningElement,
  path: string[],
  serializedValue: string | undefined,
) {
  const parseExpr = (val: string) =>
    parser.parseExpression(val, {
      strictMode: true,
      plugins: ["jsx", "typescript"],
    });
  const key = path[0];
  const innerPath = path.slice(1);
  let found = false;
  if (node.type === "JSXOpeningElement") {
    let deleteIndex = -1;
    node.attributes.forEach((prop, index) => {
      if (prop.type === "JSXAttribute" && prop.name.name === key) {
        found = true;
        if (path.length === 1) {
          if (serializedValue) {
            prop.value = t.jsxExpressionContainer(parseExpr(serializedValue));
          } else {
            deleteIndex = index;
          }
        } else {
          const oldValue = prop.value;
          if (
            oldValue == null ||
            oldValue.type !== "JSXExpressionContainer" ||
            oldValue.expression.type !== "ObjectExpression"
          ) {
            if (serializedValue) {
              prop.value = t.jsxExpressionContainer(
                parseExpr(serializeObjectChain(innerPath, serializedValue)),
              );
            }
          } else {
            if (
              recursiveUpdateNode(
                oldValue.expression,
                innerPath,
                serializedValue,
              )
            ) {
              deleteIndex = index;
            }
          }
        }
      }
    });
    if (deleteIndex !== -1) {
      removeAt(node.attributes, deleteIndex);
    }
    if (!found && serializedValue) {
      node.attributes.push(
        t.jsxAttribute(
          t.jsxIdentifier(key),
          t.jsxExpressionContainer(
            parseExpr(serializeObjectChain(innerPath, serializedValue)),
          ),
        ),
      );
    }
    return false;
  } else {
    let deleteIndex = -1;
    node.properties.forEach((prop, index) => {
      if (
        prop.type === "ObjectProperty" &&
        prop.key.type === "Identifier" &&
        prop.key.name === key
      ) {
        found = true;
        if (path.length === 1) {
          if (serializedValue) {
            prop.value = parseExpr(serializedValue);
          } else {
            deleteIndex = index;
          }
        } else {
          const oldValue = prop.value;
          if (oldValue === null || oldValue.type !== "ObjectExpression") {
            if (serializedValue) {
              prop.value = parseExpr(
                serializeObjectChain(innerPath, serializedValue),
              );
            }
          } else {
            if (recursiveUpdateNode(oldValue, innerPath, serializedValue)) {
              deleteIndex = index;
            }
          }
        }
      }
    });
    if (deleteIndex !== -1) {
      removeAt(node.properties, deleteIndex);
      if (node.properties.length === 0) {
        return true;
      }
    }
    if (!found && serializedValue) {
      node.properties.push(
        t.objectProperty(
          t.identifier(key),
          parseExpr(serializeObjectChain(innerPath, serializedValue)),
        ),
      );
    }
    return false;
  }
}

export function updateComponentCode(
  docsCtx: DocsPortalCtx,
  path: string[],
  value: any,
  isValueSerialized: boolean,
  param: Param | undefined,
) {
  const component = docsCtx.getFocusedComponent();
  const tryParseAndUpdateCode = (code: string | undefined) => {
    try {
      const file = parser.parse(ensure(code, "must have code"), {
        strictMode: true,
        plugins: ["jsx", "typescript"],
      });
      const statement = file.program.body[0];
      if (
        !code ||
        file.program.body.length !== 1 ||
        statement.type !== "ExpressionStatement" ||
        statement.expression.type !== "JSXElement"
      ) {
        return null;
      }
      const expression = statement.expression;
      if (expression.openingElement.name.type !== "JSXIdentifier") {
        return null;
      }

      expression.openingElement.name.name = docsCtx.useLoader()
        ? "PlasmicComponent"
        : isPlumeComponent(component)
          ? getExportedComponentName(component)
          : makePlasmicComponentName(component);

      let pathToUse = path;

      if (docsCtx.useLoader() && path[0] !== "componentProps") {
        pathToUse = ["componentProps", ...path];
      }
      const serializedValue = isValueSerialized
        ? (value as string)
        : value
          ? serializeToggleValue(component, value, param)
          : undefined;
      recursiveUpdateNode(
        expression.openingElement,
        pathToUse,
        serializedValue,
      );
      const newCode = generate(file as any).code;
      return newCode.trim().replace(/;$/, "");
    } catch {
      return null;
    }
  };
  return (
    tryParseAndUpdateCode(docsCtx.getComponentCustomCode(component)) ||
    tryParseAndUpdateCode(
      "// Try directly editing this code to pass in different props and overrides\n" +
        serializeToggledComponent(
          component,
          docsCtx.getComponentToggles(component),
          docsCtx.useLoader(),
        ),
    )
  );
}

function togglesToProps(
  component: Component,
  toggles: Map<Param, any>,
): Record<string, string> {
  return Object.fromEntries(
    [...toggles.entries()].map(([param, value]) => [
      toVarName(param.variable.name),
      serializeToggleValue(component, value, param),
    ]),
  );
}

function serializePlasmicLoaderComponent(
  component: Component,
  props: Record<string, string>,
) {
  const componentProps = Object.entries(props)
    .map(([key, value]) => `"${key}":${value}`)
    .join(",\n");
  return `<PlasmicComponent component="${component.name}" ${
    componentProps.length ? `componentProps={{ ${componentProps} }}` : ""
  } />`;
}

function serializeCodegenComponent(
  component: Component,
  props: Record<string, string>,
  useSkeleton: boolean,
  forceName?: string,
) {
  const componentName =
    forceName ??
    (useSkeleton
      ? getExportedComponentName(component)
      : makePlasmicComponentName(component));

  return `
<${componentName}
  ${Object.entries(props)
    .map(([key, value]) => `${key}={${value}}`)
    .join("\n")}
/>
`;
}

export function serializeComponent(
  component: Component,
  props: Record<string, string>,
  useLoader: boolean,
  useSkeleton: boolean,
  forceName?: string,
) {
  const code = useLoader
    ? serializePlasmicLoaderComponent(component, props)
    : serializeCodegenComponent(component, props, useSkeleton, forceName);

  return code.trim();
}

// Keep serialization synchronous and only format after storing, so MobX tracks
// model reads and rapid prop edits build on the latest code.
export async function formatDocsCode(code: string) {
  return (
    await Prettier.format(code, {
      parser: "typescript",
      plugins: [parserTypescript, printerEstree],
      trailingComma: "none",
    })
  )
    .trim()
    .replace(/;$/, "");
}

export function serializeToggledComponent(
  component: Component,
  toggles: Map<Param, any>,
  useLoader: boolean,
) {
  const props = togglesToProps(component, toggles);
  return serializeComponent(
    component,
    props,
    useLoader,
    isPlumeComponent(component),
  );
}

export function serializeToggledIcon(
  icon: ImageAsset,
  toggles: Map<IconToggleProp, string>,
  useLoader: boolean,
) {
  const iconName = makeAssetClassName(icon);
  const props = [...toggles.entries()]
    .map(
      ([param, value]) => `${param}${useLoader ? ":" : "="}${jsLiteral(value)}`,
    )
    .join(useLoader ? ",\n" : "\n");
  if (useLoader) {
    return `<PlasmicComponent component="${iconName}" ${
      props.length ? `componentProps={{${props}}}` : ""
    } />`;
  }

  return `<${iconName} ${props} />`.trim();
}

function serializeToggleValue(
  component: Component,
  value: any,
  param: Param | undefined,
) {
  if (L.isString(value)) {
    return jsLiteral(value);
  }
  if (isKnownImageAssetRef(value)) {
    return jsLiteral(value.asset.dataUri);
  }
  const variantGroup =
    param && component.variantGroups.find((g) => g.param === param);
  if (variantGroup) {
    if (isStandaloneVariantGroup(variantGroup)) {
      return value ? jsLiteral(true) : jsLiteral(false);
    } else if (variantGroup.multi) {
      return jsLiteral((value as Variant[]).map((v) => toVarName(v.name)));
    } else {
      return jsLiteral(toVarName((value as Variant).name));
    }
  } else {
    return jsLiteral(null);
  }
}
