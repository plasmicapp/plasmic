export type PreviewRender =
  | { notFound: string }
  // Call the `__run` export of this module
  | { run: string }
  | {
      root: string;
      isPage: boolean;
      depCss: string[];
      propsModule: string;
      globalContexts?: string;
      styleTokensProvider?: string;
      globalVariants: { module: string; provider: string; prop: string }[];
      page?: {
        route: string;
        params?: Record<string, string>;
        query: Record<string, string>;
      };
      globals: Record<string, unknown>;
      appUser: unknown;
    };

type Values = Record<string, unknown>;

export function createPreview(
  Sub: any,
  require: (spec: string) => any,
  renderRoot: (node: any) => Promise<void>,
) {
  const React = Sub.React;
  const h = React.createElement;
  let setProps: ((props: Values) => void) | undefined;
  let setGlobals: ((globals: Values) => void) | undefined;

  function render(spec: PreviewRender) {
    setProps = setGlobals = undefined;
    if ("notFound" in spec) {
      return renderRoot(h(NotFound, { path: spec.notFound }));
    }
    if ("run" in spec) {
      return require(spec.run).__run();
    }
    spec.depCss.forEach(require);
    const Root = require(spec.root).default;
    const initialProps: Values = require(spec.propsModule).default;
    const StyleTokensProvider =
      spec.styleTokensProvider &&
      require(spec.styleTokensProvider).StyleTokensProvider;
    const GlobalContexts =
      spec.globalContexts && require(spec.globalContexts).default;
    const globalVariants = spec.globalVariants.map((g) => ({
      Provider: require(g.module)[g.provider],
      prop: g.prop,
    }));
    const reactWeb = require("@plasmicapp/react-web");

    const PreviewRoot = () => {
      const [props, _setProps] = React.useState(initialProps);
      const [globals, _setGlobals] = React.useState(spec.globals);
      setProps = (p) => _setProps((prev: Values) => ({ ...prev, ...p }));
      setGlobals = _setGlobals;

      let content = h(
        "div",
        {
          className: `live-root-container ${
            spec.isPage ? "" : "live-root-container--centered"
          }`,
        },
        h(Root, { ...props, __plasmicIsPreviewRoot: true }),
      );
      // The root project's token overrides must win over dependencies' tokens.
      if (StyleTokensProvider) {
        content = h(StyleTokensProvider, null, content);
      }
      if (GlobalContexts) {
        content = h(GlobalContexts, null, content);
      }
      for (const { Provider, prop } of globalVariants) {
        content = h(Provider, { value: globals[prop] }, content);
      }
      if (spec.page && Sub.PageParamsProvider) {
        content = h(Sub.PageParamsProvider, spec.page, content);
      }
      content = h(
        reactWeb.PlasmicDataSourceContextProvider,
        { value: spec.appUser },
        content,
      );
      if (+React.version.split(".")[0] >= 18 && Sub.DataProvider) {
        content = h(
          Sub.DataProvider,
          {
            name: "plasmicInternalEnableLoadingBoundary",
            hidden: true,
            data: true,
          },
          h(React.Suspense, { fallback: "Loading..." }, content),
        );
      }
      return content;
    };

    return renderRoot(h(PreviewRoot));
  }

  function NotFound({ path }: { path: string }) {
    return h(
      "div",
      { style: { width: "100%", height: "100%", padding: "0 20px" } },
      h("h1", null, "Page not found"),
      h(
        "p",
        null,
        "There is no page component with path ",
        h(
          "tt",
          {
            style: {
              background: "#eee",
              border: "solid 1px #aaa",
              padding: 3,
            },
          },
          path,
        ),
        " in this Plasmic project.",
      ),
    );
  }

  return {
    render,
    setProps: (props: Values) => setProps?.(props),
    setGlobals: (globals: Values) => setGlobals?.(globals),
  };
}
