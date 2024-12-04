import {
  getEnvId,
  RenderingCtx,
} from "@/wab/client/components/canvas/canvas-rendering";
import { handleError } from "@/wab/client/ErrorNotifications";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import {
  classNameProp,
  dataCanvasEnvsProp,
  valKeyProp,
  valOwnerProp,
} from "@/wab/shared/canvas-constants";
import { getExportedComponentName } from "@/wab/shared/codegen/react-p/serialize-utils";
import { getComponentDisplayName } from "@/wab/shared/core/components";
import { summarizeTpl } from "@/wab/shared/core/tpls";
import { DEVFLAGS } from "@/wab/shared/devflags";
import {
  Component,
  isKnownComponent,
  TplNode,
} from "@/wab/shared/model/classes";
import { debounce } from "lodash";
import { computedFn } from "mobx-utils";
import type React from "react";

export interface CanvasErrorBoundaryProps {
  nodeOrComponent: TplNode | Component;
  nodeProps?: Record<string, any>;
  children: React.ReactNode;
  ctx: RenderingCtx;
}

interface CanvasErrorBoundaryState {
  error?: Error | null;
}

export const mkCanvasErrorBoundary = computedFn(
  (react: typeof React, viewCtx: ViewCtx) => {
    const ReactComponent = react.Component;
    return class CanvasErrorBoundary extends ReactComponent<
      CanvasErrorBoundaryProps,
      CanvasErrorBoundaryState
    > {
      static contextType = viewCtx.canvasCtx.Sub.DataContext;

      constructor(props) {
        super(props);
        this.state = {};
      }

      static getDerivedStateFromError(error: Error) {
        return { error };
      }

      componentDidMount() {
        this.componentDidMountOrUpdate();
      }

      componentDidUpdate() {
        this.componentDidMountOrUpdate();
      }

      private componentDidMountOrUpdate() {
        // Upon mount or update, if we're currently rendering an error,
        // we add a listener for whenever a re-render happens, and forces
        // this component to re-render. This would trigger the logic in
        // getDerivedStateFromProps() and unset the error.
        //
        // Let's say there's some code component somewhere down this React
        // tree that is throwing an error due to an invalid prop. The user
        // may try to fix that prop, but nothing will re-render. That's
        // because the fix does not cause the root component to re-render
        // (because we cache rendering result at the TplNode level, so
        // only affected TplNodes get re-rendered). And if the root component
        // doesn't re-render, then this CanvasErrorBoundary installed at the
        // root also won't re-render.
        //
        // We also can't just use mkUseCanvasObserver() like in other places,
        // because we're not observing any reads off of any observable model
        // in this component, so that also wouldn't trigger any re-rendering.
        //
        // Instead, we need to directly subscribe our this.forceUpdate() with
        // the viewCtx, so that this is forced to re-render any time the viewCtx
        // re-renders the canvas.
        if (this.state.error) {
          viewCtx.addRerenderObserver(() => {
            // On next re-render, we unset the error so that we can
            // try rendering children again
            this.setState({
              error: null,
            });
          });
        }
      }

      render() {
        const r = react.createElement;
        const { ctx, children, nodeOrComponent, nodeProps } = this.props;
        if (this.state.error != null) {
          if (
            (this.state.error as any)?.plasmicType ===
            "PlasmicUndefinedDataError"
          ) {
            throw this.state.error;
          }
          if (DEVFLAGS.runningInCypress) {
            handleCanvasError(this.state.error);
          }

          const deriveTitle = () => {
            if (isKnownComponent(nodeOrComponent)) {
              // Error boundary at the root of a component
              const errorElement = deriveOffendingElement(this.state.error);
              if (errorElement) {
                return `Error in ${getExportedComponentName(
                  nodeOrComponent
                )} when rendering ${errorElement}:`;
              } else {
                return `Error in ${getExportedComponentName(nodeOrComponent)}:`;
              }
            } else {
              // Error boundary for a specific element
              return `Error in ${summarizeTpl(nodeOrComponent)}:`;
            }
          };

          return r(mkCanvasErrorDisplay(react), {
            ctx: ctx,
            error: this.state.error,
            nodeOrComponent,
            nodeProps,
            title: deriveTitle(),
          });
        } else {
          return children;
        }
      }
    };
  },
  { keepAlive: true }
);

interface CanvasErrorDisplayProps {
  ctx: RenderingCtx;
  nodeOrComponent: TplNode | Component;
  /**
   * The props used to instantiate nodeOrComponent with. We don't actually use this,
   * but it is read by globalHook to gather component props
   */
  nodeProps?: Record<string, any>;
  title: React.ReactNode;
  error: any;
}

export function withErrorDisplayFallback<T>(
  react: typeof React,
  ctx: RenderingCtx,
  nodeOrComponent: TplNode | Component,
  fn: () => T,
  _opts: {
    hasLoadingBoundary: boolean;
  }
) {
  try {
    return fn();
  } catch (error: any) {
    if (error?.plasmicType === "PlasmicUndefinedDataError") {
      throw error;
    }
    if (DEVFLAGS.runningInCypress) {
      handleCanvasError(error);
    }
    return react.createElement(mkCanvasErrorDisplay(react), {
      ctx,
      nodeOrComponent,
      error,
      title: `Error in ${
        isKnownComponent(nodeOrComponent)
          ? getComponentDisplayName(nodeOrComponent)
          : summarizeTpl(nodeOrComponent)
      }:`,
    });
  }
}

const mkCanvasErrorDisplay = computedFn(
  (react: typeof React) => {
    const ReactComponent = react.Component;
    return class CanvasErrorDisplay extends ReactComponent<CanvasErrorDisplayProps> {
      render() {
        const { ctx, title, error } = this.props;

        const valKey = ctx.valKey;
        const ownerKey = ctx.ownerKey;
        const envId = getEnvId(ctx);

        const r = react.createElement;
        return r(
          "div",
          {
            className: "__wab_error-display",
            [valKeyProp]: valKey,
            [dataCanvasEnvsProp]: envId,
            [valOwnerProp]: ownerKey,
            [classNameProp]: "__wab_error-display",
          },
          r(
            "div",
            { className: "__wab_error-display__inner" },
            r("div", { className: "__wab_error-display__heading" }, title),
            r("div", { className: "__wab_error-display__code" }, `${error}`)
          )
        );
      }
    };
  },
  { keepAlive: true }
);

function deriveOffendingElement(error: Error | null | undefined) {
  if (!error) {
    return undefined;
  }
  const match = error.stack?.match(/at (\w+)/);
  return match?.[1] ?? undefined;
}

// Only for detecting errors in e2e tests
const handleCanvasError = debounce(handleError, 500, { leading: true });
