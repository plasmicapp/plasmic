// From https://github.com/facebook/react-devtools/issues/76.
// This is how to enable React Devtools to work on the DOM inside the iframe.
// Must be run before react-dom runs.

if (typeof window !== "undefined" && window.parent !== window) {
  try {
    (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = (window as any).parent.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  } catch (err) {}
}

const root = window as any;

export const searchParams = (() => {
  try {
    return new URLSearchParams(
      location.search ||
        new URL(location.toString().replace(/#/, "?")).searchParams.get(
          "searchParams"
        ) ||
        root?.parent?.location.search ||
        ""
    );
  } catch {
    return new URLSearchParams();
  }
})();

// For now we only use our hook for code components
if (
  searchParams.get("codeComponents") === "true" &&
  root != null &&
  !root.__REACT_DEVTOOLS_GLOBAL_HOOK__
) {
  const renderers = new Map();
  // We need to set the global hook before loading react - that's why it's in
  // the preamble.
  root.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true,
    renderers,

    inject: (renderer: any) => {
      renderers.set(renderers.size + 1, renderer);
    },

    onCommitFiberRoot: (..._args: any) => {},

    onCommitFiberUnmount: (..._args: any) => {},
  };
}
