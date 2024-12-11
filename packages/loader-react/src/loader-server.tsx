import type { TokenRegistration, TraitMeta } from "@plasmicapp/host";
import { PlasmicModulesFetcher, PlasmicTracker } from "@plasmicapp/loader-core";
import type {
  PlasmicPrepassContext,
  useMutablePlasmicQueryData,
} from "@plasmicapp/query";
import React from "react";
import ReactDOM from "react-dom";
import * as jsxDevRuntime from "react/jsx-dev-runtime";
import * as jsxRuntime from "react/jsx-runtime";
import type { PlasmicComponent } from "./PlasmicComponent";
import type {
  PlasmicRootContextValue,
  PlasmicRootProvider,
} from "./PlasmicRootProvider";
import {
  BaseInternalPlasmicComponentLoader,
  CodeComponentMeta,
  CustomFunctionMeta,
  GlobalContextMeta,
  InitOptions,
  REGISTERED_CODE_COMPONENT_HELPERS,
  REGISTERED_CUSTOM_FUNCTIONS,
  SUBSTITUTED_COMPONENTS,
  SUBSTITUTED_GLOBAL_VARIANT_HOOKS,
  ServerProvidedContext,
  ServerProvidedData,
  customFunctionImportAlias,
} from "./loader-shared";
import { swrSerialize } from "./swr-util";
import {
  getGlobalVariantsFromSplits,
  mergeGlobalVariantsSpec,
} from "./variation";

const noop: (...args: any) => void = () => {};
const identity = <T,>(x: T): T => x;
const unreachable: (...args: any) => never = () => {
  debugger;
  throw new Error("Unreachable code");
};

const REACT_PROVIDER_TYPE =
  typeof Symbol === "function" && Symbol.for
    ? Symbol.for("react.provider")
    : (0xeacd as any as symbol);

export const FakeRootProviderContext: React.Context<any> = {
  _currentValue: undefined, // default value
} as any;

const FakeDataContext: React.Context<any> = {
  _currentValue: undefined, // default value
} as any;

const FakePlasmicComponentContext: React.Context<boolean> = {
  _currentValue: false, // default value
} as any;

const FakePlasmicPrepassContext: React.Context<any> = {
  _currentValue: undefined,
} as any;

const mkMetaName = (name: string) => `__plasmic_meta_${name}`;

function FakeDataCtxReader({ children }: { children: ($ctx: any) => any }) {
  const $ctx = getPrepassContextEnv().readContextValue(FakeDataContext);
  return children($ctx);
}

function FakeDataProvider({
  name,
  data,
  hidden,
  advanced,
  label,
  children,
}: any) {
  const { readContextValue, setContextValue } = getPrepassContextEnv();
  const existingEnv = readContextValue(FakeDataContext) ?? {};
  if (!name) {
    return <>{children}</>;
  } else {
    setContextValue(FakeDataContext, {
      ...existingEnv,
      [name]: data,
      [mkMetaName(name)]: { hidden, advanced, label },
    });
    return <>{children}</>;
  }
}

const fakeApplySelector = (rawData: any, selector: string | undefined) => {
  if (!selector) {
    return undefined;
  }
  let curData = rawData;
  for (const key of selector.split(".")) {
    curData = curData?.[key];
  }
  return curData;
};

function fakeUseSelector(selector: string | undefined): any {
  const rawData = getPrepassContextEnv().readContextValue(FakeDataContext);
  return fakeApplySelector(rawData, selector);
}

function fakeUseSelectors(selectors = {}): any {
  const rawData = getPrepassContextEnv().readContextValue(FakeDataContext);
  return Object.fromEntries(
    Object.entries(selectors)
      .filter(([key, selector]) => !!key && !!selector)
      .map(([key, selector]) => [
        key,
        fakeApplySelector(rawData, selector as string),
      ])
  );
}

function fakeUsePlasmicDataConfig() {
  const cache = getPrepassContextEnv().readContextValue(
    FakePlasmicPrepassContext
  );
  return { cache } as any;
}

const fakeUseMutablePlasmicQueryData: typeof useMutablePlasmicQueryData = (
  unserializedKey,
  fetcher
) => {
  const [key, args] = swrSerialize(unserializedKey);
  if (!key) {
    return {
      isValidating: false,
      mutate: (async () => {}) as any,
      data: undefined,
    };
  }
  const cache = fakeUsePlasmicDataConfig().cache as Map<string, any>;
  if (cache.has(key)) {
    return {
      isValidating: false,
      mutate: (async () => {}) as any,
      data: cache.get(key),
    };
  }
  const response = fetcher(...(args as any));
  if (response && typeof (response as Promise<any>).then == "function") {
    throw (response as Promise<any>).then((data) => cache.set(key, data));
  } else {
    cache.set(key, response);
    return {
      isValidating: false,
      mutate: (async () => {}) as any,
      data: cache.get(key),
    };
  }
};

/**
 * Class components cannot be server components, and for that reason React
 * doesn't even allow calling `createElement` on them if they are not client
 * references.
 *
 * For prepass, we replace the actual Component class with this fake one, and
 * use it as an adaptor to creating a function component instead, before calling
 * `createElement`.
 */
const FakeReactComponent = class FakeReactComponent {
  context = undefined;
  static contextType: any = undefined;
  props: any = {};
  setState: (v: any) => void = (v) => void (this.state = v);
  forceUpdate = noop;
  initRender(props: any) {
    // Called before render to set the appropriate values for props, state,
    // context... Use hooks to simulate the class component behavior.
    this.props = props;
    const dispatcher = (React as any)
      .__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher
      .current;
    const [state, setState] = dispatcher.useState({});
    this.state = state;
    this.setState = setState;
    if ((this.constructor as any).contextType) {
      this.context = dispatcher.useContext(
        (this.constructor as any).contextType
      );
    }
  }
  render = () => null;
  state: any = {};
  refs = {};
} satisfies typeof React.Component;

const fakeCreateElement: <F extends (type: any, ...args: any[]) => any>(
  originalFn: F
) => F = ((originalCreateElement: Function) =>
  (type: any, ...args: any[]) => {
    if (Object.prototype.isPrototypeOf.call(FakeReactComponent, type)) {
      return originalCreateElement((props: any) => {
        const instance: InstanceType<typeof FakeReactComponent> = new type();
        instance.initRender(props);
        return instance.render();
      }, ...args);
    }
    return originalCreateElement(type, ...args);
  }) as any;

export class InternalPrepassPlasmicLoader extends BaseInternalPlasmicComponentLoader {
  constructor(opts: InitOptions) {
    super({
      opts,
      tracker: new PlasmicTracker({
        projectIds: opts.projects.map((p) => p.id),
        platform: opts.platform,
        preview: opts.preview,
        nativeFetch: opts.nativeFetch,
      }),
      onBundleMerged: () => {
        this.refreshRegistry();
      },
      fetcher: new PlasmicModulesFetcher(opts),
      builtinModules: {
        react: {
          ...React,
          // We use this flag to indicate our packages fecthed from loader that
          // we are running in RSC environment
          ...({ isRSC: true } as any),
          createContext: <T,>(defaultValue?: T) => {
            const context: React.Context<T> = {
              _currentValue: defaultValue,
              displayName: "FakeContext",
              Provider: ({ value, children }: any) => {
                getPrepassContextEnv().setContextValue(context, value);
                return <>{children}</>;
              },
              Consumer: ({ children }: any) =>
                children(getPrepassContextEnv().readContextValue(context)),
            } as any;
            return context;
          },
          ...Object.fromEntries(
            [
              "useCallback",
              "useContext",
              "useEffect",
              "useImperativeHandle",
              "useDebugValue",
              "useInsertionEffect",
              "useLayoutEffect",
              "useMemo",
              "useSyncExternalStore",
              "useReducer",
              "useRef",
              "useState",
            ].map((hook) => [
              hook,
              (...args: any) => {
                const dispatcher = (React as any)
                  .__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
                  .ReactCurrentDispatcher.current;
                return dispatcher[hook](...args);
              },
            ])
          ),
          useDeferredValue: (v) => v,
          useTransition: () => [
            false,
            (f) => {
              f();
            },
          ],
          createFactory: (type: any) =>
            React.createElement.bind(null, type) as any,
          Component: FakeReactComponent,
          PureComponent: FakeReactComponent,
          createElement: fakeCreateElement(React.createElement),
        },
        "react-dom": ReactDOM,
        "react/jsx-runtime": {
          ...jsxRuntime,
          ...((jsxRuntime as any).jsx
            ? { jsx: fakeCreateElement((jsxRuntime as any).jsx) }
            : {}),
          ...((jsxRuntime as any).jsxs
            ? { jsxs: fakeCreateElement((jsxRuntime as any).jsxs) }
            : {}),
          ...((jsxRuntime as any).jsxDEV
            ? { jsxDEV: fakeCreateElement((jsxRuntime as any).jsxDEV) }
            : {}),
        },
        "react/jsx-dev-runtime": {
          ...jsxDevRuntime,
          ...((jsxDevRuntime as any).jsx
            ? { jsx: fakeCreateElement((jsxDevRuntime as any).jsx) }
            : {}),
          ...((jsxDevRuntime as any).jsxs
            ? { jsxs: fakeCreateElement((jsxDevRuntime as any).jsxs) }
            : {}),
          ...((jsxDevRuntime as any).jsxDEV
            ? { jsxDEV: fakeCreateElement((jsxDevRuntime as any).jsxDEV) }
            : {}),
        },
        "@plasmicapp/query": {
          addLoadingStateListener: () => noop,
          isPlasmicPrepass: () => true,
          PlasmicPrepassContext: {} as any,
          PlasmicQueryDataProvider: ({ children }: any) => <>{children}</>,
          useMutablePlasmicQueryData: fakeUseMutablePlasmicQueryData,
          usePlasmicDataConfig: fakeUsePlasmicDataConfig,
          usePlasmicQueryData: fakeUseMutablePlasmicQueryData,
          useSWRConfig: unreachable,
          wrapLoadingFetcher: identity,
          HeadMetadataContext: {
            _currentValue: {},
            displayName: "FakeHeadMetadataContext",
            Provider: ({ children }: any) => <>{children}</>,
            Consumer: ({ children }: any) => children({}),
          } as any as React.Context<any>,
        },
        "@plasmicapp/data-sources-context": (() => {
          const FakePlasmicDataSourceContext: React.Context<any> = {
            _currentValue: undefined, // default value
          } as any;
          return {
            PlasmicDataSourceContextProvider: Object.assign(
              ({ children, value }: any) => {
                const { setContextValue } = getPrepassContextEnv();
                setContextValue(FakePlasmicDataSourceContext, value);
                return <>{children}</>;
              },
              {
                $$typeof: REACT_PROVIDER_TYPE,
                _context: FakePlasmicDataSourceContext,
              }
            ),
            useCurrentUser: () => {
              const { readContextValue } = getPrepassContextEnv();
              const ctx = readContextValue(FakePlasmicDataSourceContext);
              return (
                ctx?.user ?? {
                  isLoggedIn: false,
                }
              );
            },
            usePlasmicDataSourceContext: () => {
              const { readContextValue } = getPrepassContextEnv();
              return readContextValue(FakePlasmicDataSourceContext);
            },
          };
        })(),
        "@plasmicapp/host": (() => {
          return {
            applySelector: fakeApplySelector,
            DataContext: FakeDataContext,
            DataCtxReader: FakeDataCtxReader,
            DataProvider: FakeDataProvider,
            GlobalActionsContext: {
              _currentValue: undefined, // default value
            } as any as React.Context<any>,
            GlobalActionsProvider: ({ children }) => <>{children}</>,
            mkMetaName,
            mkMetaValue: identity,
            PageParamsProvider: ({ children }) => <>{children}</>,
            PlasmicCanvasContext: { _currentValue: false } as any,
            PlasmicCanvasHost: () => null,
            PlasmicLinkProvider: ({ children }) => <>{children}</>,
            registerComponent: noop,
            registerFunction: noop,
            registerGlobalContext: noop,
            registerToken: noop,
            registerTrait: noop,
            repeatedElement: unreachable,
            stateHelpersKeys: ["initFunc", "onChangeArgsToValue", "onMutate"],
            unstable_registerFetcher: noop,
            useDataEnv: () =>
              getPrepassContextEnv().readContextValue(FakeDataContext),
            useGlobalActions: () =>
              new Proxy(
                {},
                {
                  get: () => noop,
                }
              ),
            usePlasmicTranslator: () => undefined,
            PlasmicTranslatorContext: { _currentValue: undefined } as any,
            usePlasmicCanvasContext: () => false,
            usePlasmicLink: () => (props) => <a {...props} />,
            usePlasmicLinkMaybe: () => undefined,
            useSelector: fakeUseSelector,
            useSelectors: fakeUseSelectors,
            usePlasmicCanvasComponentInfo: () => null,
          };
        })(),
        "@plasmicapp/loader-runtime-registry": {
          components: SUBSTITUTED_COMPONENTS,
          globalVariantHooks: SUBSTITUTED_GLOBAL_VARIANT_HOOKS,
          codeComponentHelpers: REGISTERED_CODE_COMPONENT_HELPERS,
          functions: REGISTERED_CUSTOM_FUNCTIONS,
        },
      },
    });
  }

  registerComponent<T extends React.ComponentType<any>>(
    component: T,
    meta: CodeComponentMeta<React.ComponentProps<T>>
  ) {
    // making the component meta consistent between codegen and loader
    const stateHelpers = Object.fromEntries(
      Object.entries(meta.states ?? {})
        .filter(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          ([_, stateSpec]) =>
            // `initFunc` is the only helper function used in RSC phase
            "initFunc" in stateSpec
        )
        .map(([stateName, stateSpec]) => [
          stateName,
          { initFunc: stateSpec.initFunc },
        ])
    );
    const helpers = { states: stateHelpers };
    this.internalSubstituteComponent(
      meta.getServerInfo
        ? (props) => {
            const { readContextValue } = getPrepassContextEnv();

            const serverInfo = meta.getServerInfo?.(props, {
              readContext: readContextValue as any,
              readDataEnv: () => readContextValue(FakeDataContext),
              readDataSelector: fakeUseSelector,
              readDataSelectors: fakeUseSelectors,
              fetchData: fakeUseMutablePlasmicQueryData,
            });

            if (serverInfo && serverInfo.children) {
              const contents: React.ReactNode[] = [] as React.ReactNode[];
              const children = Array.isArray(serverInfo.children)
                ? serverInfo.children
                : [serverInfo.children];
              children.forEach((childData) => {
                contents.push(
                  <ContextAndDataProviderWrapper contextAndData={childData}>
                    {childData.node}
                  </ContextAndDataProviderWrapper>
                );
              });
              return (
                <ContextAndDataProviderWrapper contextAndData={serverInfo}>
                  {contents}
                </ContextAndDataProviderWrapper>
              );
            } else {
              return (
                <ContextAndDataProviderWrapper
                  contextAndData={serverInfo ?? {}}
                >
                  {Object.values(props)
                    .flat(Infinity)
                    .filter(
                      (v: any): v is React.ReactNode =>
                        v &&
                        typeof v == "object" &&
                        v.$$typeof &&
                        React.isValidElement(v)
                    )}
                </ContextAndDataProviderWrapper>
              );
            }
          }
        : component,
      { name: meta.name, isCode: true },
      Object.keys(stateHelpers).length > 0 ? helpers : undefined
    );
  }

  registerFunction<F extends (...args: any[]) => any>(
    fn: F,
    meta: CustomFunctionMeta<F>
  ) {
    REGISTERED_CUSTOM_FUNCTIONS[customFunctionImportAlias(meta)] = fn;
  }

  registerGlobalContext<T extends React.ComponentType<any>>(
    context: T,
    meta: GlobalContextMeta<React.ComponentProps<T>>
  ) {
    this.substituteComponent(context, { name: meta.name, isCode: true });
  }

  registerTrait: (trait: string, meta: TraitMeta) => void = noop;

  registerToken: (token: TokenRegistration) => void = noop;

  refreshRegistry() {
    // We swap global variants' useXXXGlobalVariant() hook with
    // a fake one that just reads from the PlasmicRootContext. Because
    // global variant values are not supplied by the generated global variant
    // context providers, but instead by <PlasmicRootProvider/> and by
    // PlasmicComponentLoader.setGlobalVariants(), we redirect these
    // hooks to read from them instead.
    for (const globalGroup of this.getBundle().globalGroups) {
      if (globalGroup.type !== "global-screen") {
        SUBSTITUTED_GLOBAL_VARIANT_HOOKS[globalGroup.id] = () => {
          const rootContext = getPrepassContextEnv().readContextValue(
            FakeRootProviderContext
          );
          const loader = this;
          const { name, projectId } = globalGroup;
          const spec = [
            ...loader.getGlobalVariants(),
            ...(rootContext.globalVariants ?? []),
          ].find(
            (s) =>
              s.name === name && (!s.projectId || s.projectId === projectId)
          );
          return spec ? spec.value : undefined;
        };
      }
    }
    super.refreshRegistry();
  }
}
export function handlePrepassPlasmicRootComponent(
  props: Parameters<typeof PlasmicRootProvider>[0]
) {
  const {
    globalVariants,
    globalContextsProps,
    variation,
    translator,
    Head,
    Link,
    pageRoute,
    pageParams,
    pageQuery,
    suspenseFallback,
    disableLoadingBoundary,
    user,
    userAuthToken,
    isUserLoading,
    authRedirectUri,
  } = props;
  const loader = (props.loader as any)
    .__internal as InternalPrepassPlasmicLoader;

  const splits = loader.getActiveSplits();
  const value = {
    globalVariants: mergeGlobalVariantsSpec(
      globalVariants ?? [],
      getGlobalVariantsFromSplits(splits, variation ?? {})
    ),
    globalContextsProps,
    loader,
    variation,
    translator,
    Head,
    Link,
    user,
    userAuthToken,
    isUserLoading,
    authRedirectUri,
    suspenseFallback,
    disableLoadingBoundary,
  };

  const { setContextValue, readContextValue } = getPrepassContextEnv();

  setContextValue(FakeRootProviderContext, value);

  const existingEnv = readContextValue(FakeDataContext) ?? {};

  // We can't re-use these functions from @plasmiapp/host while it's a
  // client component package :/
  const fixCatchallParams = (
    params: Record<string, string | string[] | undefined>
  ) => {
    const newParams: Record<string, string | string[]> = {};
    for (const [key, val] of Object.entries(params)) {
      if (!val) {
        continue;
      }
      if (key.startsWith("...")) {
        newParams[key.slice(3)] =
          typeof val === "string"
            ? val.replace(/^\/|\/$/g, "").split("/")
            : val;
      } else {
        newParams[key] = val;
      }
    }
    return newParams;
  };

  const mkPathFromRouteAndParams = (
    route: string,
    params: Record<string, string | string[] | undefined>
  ) => {
    if (!params) {
      return route;
    }
    let path = route;
    for (const [key, val] of Object.entries(params)) {
      if (typeof val === "string") {
        path = path.replace(`[${key}]`, val);
      } else if (Array.isArray(val)) {
        if (path.includes(`[[...${key}]]`)) {
          path = path.replace(`[[...${key}]]`, val.join("/"));
        } else if (path.includes(`[...${key}]`)) {
          path = path.replace(`[...${key}]`, val.join("/"));
        }
      }
    }
    return path;
  };

  const fixedParams = fixCatchallParams(pageParams ?? {});

  setContextValue(FakeDataContext, {
    ...existingEnv,
    ["pageRoute"]: pageRoute,
    [mkMetaName("pageRoute")]: { advanced: true, label: "Page route" },

    ["pagePath"]: pageRoute
      ? mkPathFromRouteAndParams(pageRoute, fixedParams)
      : undefined,
    [mkMetaName("pagePath")]: { label: "Page path" },

    ["params"]: { ...existingEnv.params, ...fixedParams },
    [mkMetaName("params")]: { label: "Page URL path params" },

    ["query"]: { ...existingEnv.query, ...pageQuery },
    [mkMetaName("query")]: { label: "Page URL query params" },
  });
}

export function handlePrepassPlasmicComponent(
  props: Parameters<typeof PlasmicComponent>[0]
) {
  const { component, projectId, componentProps, forceOriginal } = props;
  const { setContextValue, readContextValue } = getPrepassContextEnv();
  const rootContext: PlasmicRootContextValue = readContextValue(
    FakeRootProviderContext
  );
  const isRootLoader = !readContextValue(FakePlasmicComponentContext);
  if (!rootContext) {
    // no existing PlasmicRootProvider
    throw new Error(
      `You must use <PlasmicRootProvider/> at the root of your app`
    );
  }
  const {
    loader,
    globalContextsProps,
    userAuthToken,
    isUserLoading,
    authRedirectUri,
    translator,
    ...rest
  } = rootContext;

  const spec = { name: component, projectId, isCode: false };
  const opts = { forceOriginal };

  const lookup = loader.getLookup();

  if (!lookup.hasComponent(spec)) {
    return null;
  }

  const Component = lookup.getComponent(spec, opts);

  let element = <Component {...componentProps} />;
  if (isRootLoader) {
    const ReactWebRootProvider = lookup.getRootProvider();
    const GlobalContextsProvider = lookup.getGlobalContextsProvider({
      name: component,
      projectId,
    });
    setContextValue(FakePlasmicComponentContext, true);
    element = (
      <ReactWebRootProvider
        {...rest}
        userAuthToken={userAuthToken}
        isUserLoading={isUserLoading}
        authRedirectUri={authRedirectUri}
        i18n={{
          translator,
          tagPrefix: loader.opts.i18n?.tagPrefix,
        }}
      >
        {element}
      </ReactWebRootProvider>
    );
    if (GlobalContextsProvider) {
      element = (
        <GlobalContextsProvider {...globalContextsProps}>
          {element}
        </GlobalContextsProvider>
      );
    }
  }
  return element;
}

export function handlePlasmicPrepassContext({
  cache,
}: Parameters<typeof PlasmicPrepassContext>[0]) {
  getPrepassContextEnv().setContextValue(FakePlasmicPrepassContext, cache);
}

function getPrepassContextEnv(): {
  setContextValue: (context: React.Context<any>, value: any) => void;
  readContextValue: (context: React.Context<any>) => any;
} {
  return (globalThis as any).__ssrPrepassEnv;
}

// Provides context values to the children, described by
// `ComponentMeta.getServerInfo`.
function ContextAndDataProviderWrapper({
  children,
  contextAndData,
}: {
  children: React.ReactNode;
  contextAndData: {
    providedData?: ServerProvidedData | ServerProvidedData[];
    providedContexts?: ServerProvidedContext | ServerProvidedContext[];
  };
}) {
  const { setContextValue, readContextValue } = getPrepassContextEnv();
  const contexts = contextAndData.providedContexts
    ? Array.isArray(contextAndData.providedContexts)
      ? contextAndData.providedContexts
      : [contextAndData.providedContexts]
    : [];
  const providedData = contextAndData.providedData
    ? Array.isArray(contextAndData.providedData)
      ? contextAndData.providedData
      : [contextAndData.providedData]
    : [];
  contexts.forEach((context) => {
    setContextValue(context.contextKey as any, context.value);
  });
  let $ctx = readContextValue(FakeDataContext) ?? {};
  providedData.forEach(({ name, data }) => {
    $ctx = {
      ...$ctx,
      [name]: data,
    };
  });
  setContextValue(FakeDataContext, $ctx);
  return <>{children}</>;
}
