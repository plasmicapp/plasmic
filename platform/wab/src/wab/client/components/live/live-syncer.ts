import {
  absorbLinkClick,
  showCanvasAuthNotification,
} from "@/wab/client/components/canvas/studio-canvas-util";
import { PreviewCtx } from "@/wab/client/components/live/PreviewCtx";
import {
  getLiveFrameClientJs,
  getReactWebBundle,
} from "@/wab/client/components/studio/studio-bundles";
import { scriptExec } from "@/wab/client/dom-utils";
import { requestIdleCallback } from "@/wab/client/requestidlecallback";
import { StudioAppUser, StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { safeCallbackify } from "@/wab/commons/control";
import { SiteInfo } from "@/wab/shared/SharedApi";
import { getSlotParams } from "@/wab/shared/SlotUtils";
import { VariantCombo, isScreenVariantGroup } from "@/wab/shared/Variants";
import {
  allCodeLibraries,
  allCustomFunctions,
  componentToDeepReferenced,
} from "@/wab/shared/cached-selectors";
import { getBuiltinComponentRegistrations } from "@/wab/shared/code-components/builtin-code-components";
import {
  CodeComponentWithHelpers,
  isCodeComponentWithHelpers,
} from "@/wab/shared/code-components/code-components";
import {
  ComponentGenHelper,
  SiteGenHelper,
} from "@/wab/shared/codegen/codegen-helpers";
import {
  exportIconAsset,
  extractUsedIconAssetsForComponents,
} from "@/wab/shared/codegen/image-assets";
import {
  computeSerializerSiteContext,
  exportProjectConfig,
  exportReactPresentational,
  exportStyleConfig,
} from "@/wab/shared/codegen/react-p";
import {
  codeLibraryImportAlias,
  customFunctionImportAlias,
} from "@/wab/shared/codegen/react-p/custom-functions";
import {
  makeCodeComponentHelperSkeletonIdFileName,
  makeComponentSkeletonIdFileName,
  makeGlobalGroupImports,
  makePlasmicIsPreviewRootComponent,
  wrapGlobalProviderWithCustomValue,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import {
  ComponentExportOutput,
  ExportOpts,
  GlobalContextBundle,
  ProjectConfig,
} from "@/wab/shared/codegen/types";
import { jsLiteral, toVarName } from "@/wab/shared/codegen/util";
import { exportGlobalVariantGroup } from "@/wab/shared/codegen/variants";
import { ensure, mkUuid, spawn } from "@/wab/shared/common";
import {
  CodeComponent,
  getCodeComponentHelperImportName,
  getCodeComponentImportName,
  isCodeComponent,
  isPageComponent,
} from "@/wab/shared/core/components";
import { ExprCtx, getRawCode } from "@/wab/shared/core/exprs";
import { allGlobalVariantGroups } from "@/wab/shared/core/sites";
import { CssVarResolver } from "@/wab/shared/core/styles";
import { DEVFLAGS } from "@/wab/shared/devflags";
import {
  Component,
  ImageAsset,
  Site,
  VariantGroup,
  isKnownPropParam,
} from "@/wab/shared/model/classes";
import { getPlumeEditorPlugin } from "@/wab/shared/plume/plume-registry";
import * as Sentry from "@sentry/browser";
import * as asynclib from "async";
import L from "lodash";
import { autorun, comparer, untracked } from "mobx";
import { computedFn } from "mobx-utils";

export interface CodeModule {
  name?: string;
  source: string;
  lang: string;
  run?: boolean;
}

export function pushPreviewModules(
  doc: Document,
  previewCtx: PreviewCtx,
  opts: { lazy?: boolean }
) {
  const { lazy } = opts;

  // We use a queue here to make sure we render frames serially;
  // latest request will be rendered last.
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  const renderQueue = asynclib.cargo(
    safeCallbackify(async (tasks: any[]) => {
      const { modules } = ensure(
        L.last(tasks),
        "tasks are expected to contain at least one task"
      ) as any;
      return new Promise<void>((resolve) => {
        const listener = (event: MessageEvent) => {
          if (
            event.data.source === "plasmic-live" &&
            event.data.type === "rendered"
          ) {
            if (doc.defaultView) {
              doc.defaultView.removeEventListener("message", listener);
            }
            resolve();
          }
          if (
            event.data.source === "plasmic-live" &&
            event.data.type === "error"
          ) {
            console.error("Live frame refresh error", event.data.error);
            Sentry.captureException(event.data.error);
            resolve();
          }
        };
        if (doc.defaultView) {
          doc.defaultView.addEventListener("message", listener);
        }

        updateModules(doc, modules);
      });
    })
  );

  // We wrap the code generation in an autorun; this means any updates to
  // model objects used during the code generation will trigger a re-run.
  const disposeRun = autorun(
    () => {
      const modules: CodeModule[] = [];

      if (!previewCtx.previewData) {
        // If there is no preview data we can't push module yet as it will be pushed a 404 at first
        return;
      }

      const studioCtx = previewCtx.studioCtx;

      const site = studioCtx.site;
      const siteInfo = studioCtx.siteInfo;
      const projectConfig = createProjectOutput(site, siteInfo);
      modules.push(...createProjectMods(projectConfig));

      const rootComponent = site.components.find(
        (c) => c.uuid === previewCtx.component?.uuid
      );
      if (!rootComponent) {
        modules.push(...createPreview404(previewCtx.previewPath));
        spawn(renderQueue.push({ modules }));
        return;
      }

      const rootOutput = createComponentOutput(
        studioCtx,
        rootComponent,
        projectConfig,
        false
      );
      modules.push(...createComponentModules(rootOutput));

      const referencedComponents = extractDependentComponents(rootComponent);
      for (const component of referencedComponents) {
        if (isCodeComponent(component)) {
          modules.push(
            createCodeComponentModule(component, { idFileNames: true })
          );
          if (isCodeComponentWithHelpers(component)) {
            modules.push(
              createCodeComponentHelperModule(component, { idFileNames: true })
            );
          }
        } else {
          if (component !== rootComponent) {
            modules.push(
              ...createComponentModules(
                createComponentOutput(
                  studioCtx,
                  component,
                  projectConfig,
                  false
                )
              )
            );
          }
        }
      }

      const referencedIcons = extractUsedIconAssetsForComponents(site, [
        ...referencedComponents,
      ]);
      const iconMods = [...referencedIcons]
        .filter((x) => x.dataUri)
        .map((asset) => createIconAssetModule(asset));
      modules.push(...iconMods);

      const globalVariantGroups = allGlobalVariantGroups(
        previewCtx.studioCtx.site,
        {
          includeDeps: "all",
          excludeEmpty: true,
        }
      );

      modules.push(...processGlobalContexts(studioCtx, projectConfig));

      modules.push(
        ...globalVariantGroups.map((group) =>
          createGlobalVariantGroupModule(group)
        )
      );

      modules.push(createCustomFunctionsModule(site));

      modules.push(
        ...createPreviewScript(
          rootOutput,
          previewCtx,
          projectConfig.globalContextBundle
        )
      );

      spawn(renderQueue.push({ modules }));
    },
    {
      name: "liveUpdate",
      ...(lazy ? { scheduler: (run) => requestIdleCallback(run) } : {}),
    }
  );

  // if the activated variants have changed via the variants picker, we update via
  // the window.setPreviewGlobalVariants() and window.setPreviewComponentProps()
  // instead of loading a new systemjs module so that we don't unmount the existing
  // rendered React component, so that transition animations will run properly.
  let curVariants: VariantCombo = previewCtx.getVariants();
  const disposeVariants = autorun(
    () => {
      if (!L.isEqual(curVariants, previewCtx.getVariants())) {
        updatePreviewVariants(doc, previewCtx);
        curVariants = previewCtx.getVariants();
      }
    },
    {
      name: "liveUpdateVariants",
      ...(lazy ? { scheduler: (run) => requestIdleCallback(run) } : {}),
    }
  );

  return () => {
    disposeRun();
    disposeVariants();
  };
}

export function updatePreviewVariants(doc: Document, previewCtx: PreviewCtx) {
  updateModules(doc, [
    {
      name: `./script_${mkUuid()}.tsx`,
      lang: "tsx",
      run: true,
      source: `
      window.setPreviewGlobalVariants?.(${JSON.stringify(previewCtx.global)});
      window.setPreviewComponentProps?.(${JSON.stringify(previewCtx.variants)});
      `,
    },
  ]);
}

function processGlobalContexts(
  studioCtx: StudioCtx,
  projectConfig: ProjectConfig
) {
  if (projectConfig.globalContextBundle) {
    const contexts = studioCtx.site.globalContexts.map(
      (tpl) => tpl.component as CodeComponent
    );
    return createGlobalContextsModules(
      contexts,
      projectConfig.globalContextBundle
    );
  } else {
    return [];
  }
}

function extractDependentComponents(component: Component) {
  const referencedComps = new Set<Component>();
  const seen = new Set<Component>();

  /**
   * Add all components that this comp references (but not itself) to comps
   */
  const check = (comp: Component) => {
    if (seen.has(comp)) {
      return;
    }

    seen.add(comp);

    // First check for components that are deeply  used by this comp
    for (const dep of componentToDeepReferenced(comp)) {
      check(dep);
      referencedComps.add(dep);
    }

    // Next, generated code for this component will also need to reference
    // its super component (to read from its context).  So also add reference
    // to its super component, and _its_ deep dependencies
    if (comp.superComp) {
      referencedComps.add(comp.superComp);
      check(comp.superComp);
    }

    for (const subComp of comp.subComps) {
      referencedComps.add(subComp);
      check(subComp);
    }
  };

  check(component);
  return referencedComps;
}

export function createComponentModules(output: ComponentExportOutput) {
  return [
    {
      name: `./${output.renderModuleFileName}`,
      lang: "tsx",
      source: output.renderModule,
    },
    {
      name: `./${output.skeletonModuleFileName}`,
      lang: "tsx",
      source: output.skeletonModule,
    },
    {
      name: `./${output.cssFileName}`,
      lang: "css",
      source: output.cssRules,
    },
  ];
}

export function createCodeComponentHelperModule(
  component: CodeComponentWithHelpers,
  opts?: { idFileNames?: boolean }
) {
  const importName = getCodeComponentHelperImportName(component);
  const mkImpl = (): string => {
    return `([...(window as any).__PlasmicComponentRegistry, ...((window as any).__PlasmicBuiltinRegistry ?? [])]).find(
      ({meta}) => meta.name === ${jsLiteral(component.name)}
    ).meta.componentHelpers?.helpers`;
  };
  const source = `
  ${DEVFLAGS.ccStubs ? `import React from "react";` : ""}
  ${
    component.codeComponentMeta.helpers?.defaultExport ? "" : "export "
  }const ${importName} = ${mkImpl()};
  ${
    component.codeComponentMeta.helpers?.defaultExport
      ? `export default ${importName}`
      : ""
  }
  `;
  const fileName = opts?.idFileNames
    ? makeCodeComponentHelperSkeletonIdFileName(component)
    : importName;
  return {
    name: `./${fileName}.tsx`,
    lang: "tsx",
    source,
  };
}

function codeComponentNotFoundMessage(name: string) {
  return `[host-app-error] Code component '${name}' was not found in the current host app.`;
}

export function createCodeComponentModule(
  component: CodeComponent,
  opts?: { idFileNames?: boolean }
) {
  const importName = getCodeComponentImportName(component);
  const mkImpl = (): string => {
    if (DEVFLAGS.ccStubs) {
      const slotNames = getSlotParams(component).map(
        (param) => param.variable.name
      );
      return `(props: {}) => {
        const slotNames = ${JSON.stringify(slotNames)}
        const filteredProps = Object.fromEntries(Object.entries(props).filter(([key]) => !slotNames.includes(key)));
        return (<div {...filteredProps}>{slotNames.map((name) => props[name]).filter((v) => v != null)}</div>);
      }`;
    } else {
      return `ensure(
        ([
          ...(window as any).__PlasmicComponentRegistry,
          ...((window as any).__PlasmicContextRegistry ?? []),
          ...((window as any).__PlasmicBuiltinRegistry ?? [])
        ]).find(
          ({meta}) => meta.name === ${jsLiteral(component.name)}
        )
      , "${codeComponentNotFoundMessage(component.name)}").component`;
    }
  };
  const source = `
  ${DEVFLAGS.ccStubs ? `import React from "react";` : ""}
  const ensure = (x: any, msg: string) => {
    if (x === undefined || x === null) {
      throw new Error(msg);
    }
    return x;
  };
  ${
    component.codeComponentMeta.defaultExport ? "" : "export "
  }const ${importName} = ${mkImpl()};
  ${
    component.codeComponentMeta.defaultExport
      ? `export default ${importName}`
      : ""
  }
  `;
  const fileName = opts?.idFileNames
    ? makeComponentSkeletonIdFileName(component)
    : importName;
  return {
    name: `./${fileName}.tsx`,
    lang: "tsx",
    source,
  };
}

function createGlobalContextsModules(
  contexts: CodeComponent[],
  globalContextsBundle: GlobalContextBundle
) {
  return [
    ...contexts.map((c) => createCodeComponentModule(c, { idFileNames: true })),
    {
      name: `./PlasmicGlobalProviders.tsx`,
      lang: "tsx",
      source: globalContextsBundle.contextModule,
    },
  ];
}

function createPreviewScript(
  rootOutput: ComponentExportOutput,
  previewCtx: PreviewCtx,
  globalContextsBundle?: GlobalContextBundle
) {
  const componentName = rootOutput.componentName;
  const componentPath = rootOutput.skeletonModuleFileName;

  let content = `React.createElement(${componentName}, {
    ...props,
    ${makePlasmicIsPreviewRootComponent()}: true
  })`;

  const containerClass = `live-root-container ${
    rootOutput.isPage ? "" : "live-root-container--centered"
  }`;
  content = `React.createElement("div", {className: "${containerClass}"}, ${content})`;

  const globalContextsImports = makeGlobalContextsImport(globalContextsBundle);
  const globalGroups = allGlobalVariantGroups(previewCtx.studioCtx.site, {
    includeDeps: "all",
    excludeEmpty: true,
  }).filter((vg) => !isScreenVariantGroup(vg));
  const globalGroupImports = makeGlobalGroupImports(globalGroups, {
    idFileNames: true,
  });

  if (globalContextsBundle) {
    content = wrapGlobalContexts(content);
  }
  for (const vg of globalGroups) {
    content = wrapGlobalProviderWithCustomValue(
      vg,
      content,
      true,
      `global.${toVarName(vg.param.variable.name)}`
    );
  }

  const component = ensure(
    previewCtx.studioCtx.site.components.find((c) => c.uuid === rootOutput.id),
    `Component being preview is expected to be in site, but there is no component with UUID ${rootOutput.id}`
  );
  if (isPageComponent(component)) {
    const path = JSON.stringify(component.pageMeta.path);
    const params = JSON.stringify(previewCtx.pageParams);
    const query = JSON.stringify(previewCtx.pageQuery);
    content = `ph.PageParamsProvider ? (
      <ph.PageParamsProvider route={${path}} params={${params}} query={${query}}>
        {(${content})}
      </ph.PageParamsProvider>
    ) : (${content})`;
  }

  content = wrapContentWithCurrentUserContext(
    content,
    previewCtx.studioCtx.currentAppUser,
    previewCtx.studioCtx.currentAppUserCtx.fakeAuthToken
  );

  // Note that below, we use mobx.untracked() to read previewCtx.variants/global. That's
  // because we have a separate autorun listening for those changes already, and we don't
  // want to regenerate this preview entrypoint script when they change, because that would
  // cause us to unmount the current React component.
  const serializedInitialProps: Record<string, string> = Object.fromEntries(
    Object.entries(untracked(() => previewCtx.variants)).map(([key, val]) => [
      toVarName(key),
      JSON.stringify(val),
    ])
  );

  // Use prop preview values in live preview.
  const exprCtx: ExprCtx = {
    component: null,
    projectFlags: DEVFLAGS,
    inStudio: false,
  };
  for (const param of component.params) {
    if (!isKnownPropParam(param) || !param.previewExpr) {
      continue;
    }
    serializedInitialProps[toVarName(param.variable.name)] = getRawCode(
      param.previewExpr,
      exprCtx
    );
  }

  const plugin = getPlumeEditorPlugin(component);
  if (plugin?.getArtboardRootDefaultProps) {
    const defaults = plugin.getArtboardRootDefaultProps(component);
    if (defaults) {
      for (const [key, val] of Object.entries(defaults)) {
        serializedInitialProps[key] = JSON.stringify(val);
      }
    }
  }
  return [
    {
      name: `./script_${componentName}.tsx`,
      lang: "tsx",
      run: true,
      source: `
      import React from "react";
      import ReactDOM from "react-dom";
      import * as ph from "@plasmicapp/host";
      import * as p from "@plasmicapp/react-web";
      ${globalGroupImports}
      ${globalContextsImports}
      import ${componentName} from "./${componentPath}";
      console.log("IMPORTING TOOK", performance.now() - window.startTime);
      const Sub = (window as any).__Sub;

      function PlasmicPreviewWrapper() {
        const [props, setProps] = React.useState({
          ${Object.entries(serializedInitialProps)
            .map(([key, val]) => `${key}: ${val}`)
            .join(",\n")}
        });
        const [global, setGlobal] = React.useState({
          ${Object.entries(untracked(() => previewCtx.global))
            .map(([key, val]) => `${key}: ${JSON.stringify(val)}`)
            .join(",\n")}
        })
        window.setPreviewComponentProps = (newProps) => {
          setProps({...props, ...newProps});
        };
        window.setPreviewGlobalVariants = setGlobal;
        const reactMajorVersion = +React.version.split(".")[0];
        const content = (${content});
        if (reactMajorVersion >= 18 && !!ph.DataProvider) {
          return (
            <ph.DataProvider
              name="plasmicInternalEnableLoadingBoundary"
              hidden
              data={true}
            >
              <React.Suspense fallback="Loading...">
                {content}
              </React.Suspense>
            </ph.DataProvider>
          )
        }
        return content;
      }

      export function __run() {
        const startRenderTime = performance.now();

        Sub.setPlasmicRootNode(React.createElement(PlasmicPreviewWrapper, {}));

        console.log("RENDERING TOOK", performance.now() - startRenderTime);
        window.postMessage({
          source: "plasmic-live",
          type: "rendered"
        });
      }
    `,
    },
  ];
}

function createPreview404(path: string) {
  return [
    {
      name: `./script_404_${path}.tsx`,
      lang: "tsx",
      run: true,
      source: `
      import React from "react";
      import ReactDOM from "react-dom";
      const Sub = (window as any).__Sub;

      function Preview404() {
        return (
          <div style={{ width: "100%", height: "100%", padding: "0 20px" }}>
            <h1>Page not found</h1>
            <p>
              There is no page component with path <tt style={{
                background: "#eee",
                border: "solid 1px #aaa",
                padding: 3,
              }}>${path}</tt> in this Plasmic project.
            </p>
          </div>
        );
      }

      export function __run() {
        const startRenderTime = performance.now();

        Sub.setPlasmicRootNode(React.createElement(Preview404));

        console.log("404 PAGE RENDERING TOOK", performance.now() - startRenderTime);
        window.postMessage({
          source: "plasmic-live",
          type: "rendered"
        });
      }
    `,
    },
  ];
}

export function updateModules(doc: Document, modules: CodeModule[]) {
  console.log("Sending modules", modules);
  const script = doc.createElement("script");
  script.setAttribute("type", "text/javascript");
  script.innerHTML = `
    window.startTime = performance.now();
    SystemJS.refreshXModules(${JSON.stringify(modules)}).then(() => {
      window.postMessage({
        source: "plasmic-live",
        type: "imported",
      }, "*");
    }).catch(err => {
      console.log("oops, error refreshing", err);

      const setErrorMessage = (msg) => {
        window.__Sub.setPlasmicRootNode(
          window.__Sub.React.createElement("div", {}, msg)
        );
      };

      if (err.message.startsWith("[host-app-error]")) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(\`Failed to load the preview - please refresh the browser to try again. \n\nIf the problem persits, please report a bug to Plasmic team. Thank you!\n\n\${err}\`);
      }

      window.postMessage({
        source: "plasmic-live",
        type: "error",
        error: err
      }, "*");
    });
  `;

  doc.body.append(script);
}

export async function onLoadInjectSystemJS(
  studioCtx: StudioCtx,
  frameWindow: Window,
  captureExceptions = true,
  onAnchorClick?: (href: string) => void,
  _onInteractionError?: () => void
) {
  const getlibsReady = new Promise((resolve) => {
    if ((frameWindow as any).System?.refreshXModules) {
      resolve(undefined);
    } else {
      (frameWindow as any).__GetlibsReadyResolver = resolve;
    }
  });
  await getlibsReady;
  if (!(frameWindow as any).__PlasmicReactWebBundle) {
    scriptExec(frameWindow, await getReactWebBundle());
  }
  (frameWindow as any).__PlasmicBuiltinRegistry = Object.values(
    getBuiltinComponentRegistrations({
      ...(frameWindow as any).__Sub,
      reactWeb: (frameWindow as any).__PlasmicReactWebBundle,
      dataSources: (frameWindow as any).__PlasmicDataSourcesBundle,
      dataSourcesContext: (frameWindow as any)
        .__PlasmicDataSourcesContextBundle,
    })
  );
  (frameWindow as any).__PLASMIC_EXECUTE_DATA_OP =
    studioCtx.executePlasmicDataOp;
  (frameWindow as any).__PLASMIC_MUTATE_DATA_OP =
    studioCtx.refreshFetchedDataFromPlasmicQuery;
  (frameWindow as any).__PLASMIC_GET_ALL_CACHE_KEYS =
    studioCtx.getAllDataOpCacheKeys;
  // We don't cache interaction data in live preview since
  // it can be very confusing to have values cached in $steps and event args
  // that differ from what is currently rendered in the artboard.
  (frameWindow as any).__PLASMIC_CACHE_$STEP_VALUE = () => {};
  (frameWindow as any).__PLASMIC_CACHE_EVENT_ARGS = () => {};
  (frameWindow as any).__PLASMIC_STUDIO_PATH = () => {
    return studioCtx.previewCtx?.component?.pageMeta?.path;
  };
  (frameWindow as any).__PLASMIC_AUTH_OVERRIDE = () => {
    showCanvasAuthNotification("preview mode");
  };
  const liveFrameClientJs = await getLiveFrameClientJs();
  scriptExec(frameWindow, liveFrameClientJs);
  swallowAnchorClicks(frameWindow.document, onAnchorClick);
  (frameWindow as any).__Sub.registerRenderErrorListener((error: Error) => {
    console.error("Live frame render error", error);
    if (captureExceptions) {
      Sentry.captureException(error);
    }
  });
}

function swallowAnchorClicks(
  doc: Document,
  onAnchorClick?: (href: string) => void
) {
  doc.body.addEventListener("click", function (e) {
    absorbLinkClick(e, onAnchorClick);
  });
}

// For the expensive parts of code-gen, we use computedFn to keep a cache of
// outputs as long as the model objects haven't changed.  We use keepAlive
// so that even when we're not currently using a component, we hold onto the
// generated code for it.  We're not worried about memory leak because the only
// time a component's code becomes useless for this purpose is when we delete it,
// which is rare.

export const createProjectOutput = computedFn(
  function createProjectOutput(site: Site, siteInfo: SiteInfo) {
    const exportOpts: ExportOpts = {
      lang: "ts",
      platform: "react",
      forceAllProps: true,
      uncontrolledProps: true,
      shouldTransformWritableStates: true,
      forceRootDisabled: false,
      imageOpts: {
        scheme: "cdn",
      },
      stylesOpts: { scheme: "css" },
      codeOpts: { reactRuntime: "classic" },
      fontOpts: { scheme: "import" },
      codeComponentStubs: false,
      skinnyReactWeb: false,
      skinny: false,
      importHostFromReactWeb: false,
      idFileNames: true,
      hostLessComponentsConfig: "stub",
      includeImportedTokens: true,
      relPathFromManagedToImplDir: ".",
      useComponentSubstitutionApi: false,
      useGlobalVariantsSubstitutionApi: false,
      useCodeComponentHelpersRegistry: false,
      useCustomFunctionsStub: true,
      targetEnv: "preview",
    };
    return exportProjectConfig(
      site,
      siteInfo.name,
      siteInfo.id,
      0,
      "fakeProjectRevId",
      "latest",
      exportOpts
    );
  },
  { name: "createProjectOutput", keepAlive: true, equals: comparer.structural }
);

export const createComponentOutput = computedFn(
  function createComponentOutput(
    studioCtx: StudioCtx,
    component: Component,
    projectConfig: ProjectConfig,
    forceRootDisabled: boolean
  ) {
    const exportOpts: ExportOpts = {
      lang: "ts",
      platform: "react",
      forceAllProps: true,
      uncontrolledProps: true,
      shouldTransformWritableStates: true,
      forceRootDisabled: forceRootDisabled,
      imageOpts: {
        scheme: "cdn",
      },
      stylesOpts: { scheme: "css" },
      codeOpts: { reactRuntime: "classic" },
      fontOpts: { scheme: "import" },
      codeComponentStubs: false,
      skinnyReactWeb: false,
      skinny: false,
      importHostFromReactWeb: false,
      idFileNames: true,
      hostLessComponentsConfig: "stub",
      includeImportedTokens: true,
      useComponentSubstitutionApi: false,
      useGlobalVariantsSubstitutionApi: false,
      useCodeComponentHelpersRegistry: false,
      useCustomFunctionsStub: true,
      isLivePreview: true,
      targetEnv: "preview",
    };
    console.log("Generating code for", component.name);
    const siteGenHelper = new SiteGenHelper(studioCtx.site, false);
    const cssVarResolver = new CssVarResolver(
      siteGenHelper.allStyleTokens(),
      siteGenHelper.allMixins(),
      siteGenHelper.allImageAssets(),
      studioCtx.site.activeTheme,
      {
        keepAssetRefs: false,
        useCssVariables: true,
      }
    );
    const compGenHelper = new ComponentGenHelper(siteGenHelper, cssVarResolver);
    return exportReactPresentational(
      compGenHelper,
      component,
      studioCtx.site,
      projectConfig,
      Object.fromEntries(
        studioCtx.site.imageAssets
          .filter((asset) => asset.dataUri && asset.dataUri.startsWith("http"))
          .map((asset) => [asset.uuid, asset.dataUri as string])
      ),
      false,
      false,
      studioCtx.siteInfo.appAuthProvider,
      exportOpts,
      computeSerializerSiteContext(studioCtx.site)
    );
  },
  { name: "createComponentMods", keepAlive: true, equals: comparer.structural }
);

export const createIconAssetModule = computedFn(
  function createIconAssetModule(asset: ImageAsset) {
    const bundle = exportIconAsset(asset, { idFileNames: true });
    return {
      name: `./${bundle.fileName}`,
      lang: "tsx",
      source: bundle.module,
    };
  },
  {
    name: "createIconAssetModule",
    keepAlive: true,
    equals: comparer.structural,
  }
);

export const createGlobalVariantGroupModule = computedFn(
  function createGlobalVariantGroupModule(group: VariantGroup) {
    const bundle = exportGlobalVariantGroup(group, { idFileNames: true });
    return {
      name: `./${bundle.contextFileName}`,
      lang: "tsx",
      source: bundle.contextModule,
    };
  },
  {
    name: "createGlobalVariantGroupModule",
    keepAlive: true,
    equals: comparer.structural,
  }
);

export const createCustomFunctionsModule = computedFn(
  function createCustomFunctionsModule(site: Site) {
    const source = `${allCustomFunctions(site)
      .map(
        ({ customFunction: fn }) =>
          `export const ${customFunctionImportAlias(
            fn
          )} = ((window as any).__PlasmicFunctionsRegistry ?? []).find((r) => r.meta.name === "${
            fn.importName
          }" && r.meta.namespace == ${
            fn.namespace ? `"${fn.namespace}"` : "null"
          })?.function;`
      )
      .join("\n")}
      ${allCodeLibraries(site)
        .map(
          ({ codeLibrary }) =>
            `export const ${codeLibraryImportAlias(
              codeLibrary
            )} = ((window as any).__PlasmicLibraryRegistry ?? []).find((l) => l.meta.name === "${
              codeLibrary.name
            }")?.lib;`
        )
        .join("\n")}`.trim();
    return {
      name: "./custom-functions.tsx",
      lang: "tsx",
      source,
    };
  },
  {
    name: "createCustomFunctionsModule",
    keepAlive: true,
    equals: comparer.structural,
  }
);

export const createProjectMods = computedFn(
  function createProjectMods(projectOutput: ProjectConfig) {
    const sc = exportStyleConfig({ targetEnv: "preview" });
    return [
      {
        name: `./${projectOutput.cssFileName}`,
        lang: "css",
        source: projectOutput.cssRules,
      },
      {
        name: `./${sc.defaultStyleCssFileName}`,
        lang: "css",
        source: sc.defaultStyleCssRules,
      },
    ];
  },
  { name: "createProjectMods", keepAlive: true, equals: comparer.structural }
);

function makeGlobalContextsImport(globalContextBundle?: GlobalContextBundle) {
  if (!globalContextBundle) {
    return "";
  }
  return `import GlobalProviders from "./PlasmicGlobalProviders"`;
}

function wrapGlobalContexts(content: string) {
  return `
    <GlobalProviders>
      {${content}}
    </GlobalProviders>
  `;
}

function wrapContentWithCurrentUserContext(
  content: string,
  currentUser: StudioAppUser,
  userAuthToken?: string
) {
  return `
  <p.PlasmicDataSourceContextProvider value={${jsLiteral({
    user: currentUser,
    userAuthToken,
  })}}>
    {(${content})}
  </p.PlasmicDataSourceContextProvider>
  `;
}
