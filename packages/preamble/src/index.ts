if (typeof window !== "undefined") {
  if (window.parent !== window) {
    try {
      (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ =
        (window.parent as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
    } catch (err) {}
  }
  if (!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    const renderers = new Map();
    (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true,
      renderers,
      inject: (renderer: any) => {
        renderers.set(renderers.size + 1, renderer);
      },
      onCommitFiberRoot: function () {},
      onCommitFiberUnmount: function () {},
    };
  }
  (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__.__PlasmicPreambleVersion = "1";
}