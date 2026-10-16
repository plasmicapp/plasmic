/** Complete a render when React commits, including a Suspense fallback. */
export function createRenderer(Sub: any) {
  const React = Sub.React;

  function renderRoot(node: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const dispose = Sub.hostUtils.registerRenderErrorListener(() => {
        dispose();
        resolve();
      });
      function CommittedRoot() {
        React.useLayoutEffect(() => {
          dispose();
          resolve();
        }, []);
        return node;
      }
      try {
        Sub.hostUtils.setPlasmicRootNode(React.createElement(CommittedRoot));
      } catch (error) {
        dispose();
        reject(error);
      }
    });
  }

  function showError(error: unknown) {
    const message = `${(error as Error)?.message ?? error}`;
    return renderRoot(
      React.createElement(
        "div",
        {},
        message.startsWith("[host-app-error]")
          ? message
          : `Failed to load the preview - please refresh the browser to try again. \n\nIf the problem persists, please report a bug to Plasmic team. Thank you!\n\n${message}`,
      ),
    );
  }

  return { renderRoot, showError };
}
