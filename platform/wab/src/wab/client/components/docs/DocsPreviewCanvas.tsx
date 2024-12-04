import {
  showCanvasPageNavigationNotification,
  trapInteractionError,
} from "@/wab/client/components/canvas/studio-canvas-util";
import { CodePreviewCtx } from "@/wab/client/components/docs/CodePreviewSnippet";
import { DocsPortalCtx } from "@/wab/client/components/docs/DocsPortalCtx";
import { syncDocsPreview } from "@/wab/client/components/docs/serialize-docs-preview";
import { onLoadInjectSystemJS } from "@/wab/client/components/live/live-syncer";
import { getSortedHostLessPkgs } from "@/wab/client/components/studio/studio-bundles";
import { scriptExec } from "@/wab/client/dom-utils";
import { maybeToggleTrailingSlash } from "@/wab/client/utils/app-hosting-utils";
import { usedHostLessPkgs } from "@/wab/shared/cached-selectors";
import { nodeJsName } from "@/wab/shared/codegen/react-p";
import { getExportedComponentName } from "@/wab/shared/codegen/react-p/serialize-utils";
import { toJsIdentifier } from "@/wab/shared/codegen/util";
import { ensure } from "@/wab/shared/common";
import {
  InteractionArgLoc,
  InteractionLoc,
  isInteractionLoc,
} from "@/wab/shared/core/exprs";
import { TplNamable } from "@/wab/shared/core/tpls";
import { Component } from "@/wab/shared/model/classes";
import { getPublicUrl } from "@/wab/shared/urls";
import { autorun } from "mobx";
import { observer } from "mobx-react";
import React from "react";

export const DocsPreviewCanvas = observer(function DocsPreviewCanvas(props: {
  docsCtx: DocsPortalCtx;
  codePreviewCtx?: CodePreviewCtx;
}) {
  const { docsCtx, codePreviewCtx } = props;
  const studioCtx = docsCtx.studioCtx;
  const component = docsCtx.tryGetFocusedComponent();
  const icon = docsCtx.tryGetFocusedIcon();
  const [doc, setDoc] = React.useState<Document>();
  const [frameLoaded, setFrameLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const usedPkgs = usedHostLessPkgs(studioCtx.site);
  const [toggleTrailingSlash, setToggleTrailingSlash] = React.useState(false);

  React.useEffect(() => {
    if ((!component && !icon) || !frameLoaded || !doc) {
      return;
    }

    const reposition = () => {
      // Repositions the hover box according to current view state
      if (component) {
        const focusedNode = docsCtx.getFocusedNode();
        repositionHoverBox(doc, component, focusedNode);
      }
    };

    const disposeSync = syncDocsPreview(docsCtx, doc, {
      onError: (err) => {
        setError(err);
        reposition();
      },
      onRendered: () => {
        setError(null);
        reposition();
      },
      codePreviewCtx,
    });

    const disposeHover = autorun(
      () => {
        // Whenever the focused node changes, reposition the hover box
        reposition();
      },
      { name: "DocsPreviewCanvas.hover" }
    );

    return () => {
      disposeSync();
      disposeHover();
    };
  }, [component, icon, frameLoaded, doc]);

  if (!component && !icon) {
    return null;
  }

  return (
    <>
      <iframe
        src={
          maybeToggleTrailingSlash(
            toggleTrailingSlash,
            studioCtx.getHostUrl()
          ) +
          "#live=true" +
          `&origin=${encodeURIComponent(getPublicUrl())}`
        }
        onLoad={async (event) => {
          try {
            const frameWindow = ensure(
              event.currentTarget.contentWindow,
              `currentTarget must be attached to window`
            );
            const onAnchorClick = (href) =>
              showCanvasPageNavigationNotification(studioCtx, href);
            await onLoadInjectSystemJS(
              studioCtx,
              frameWindow,
              false,
              onAnchorClick
            );
            (frameWindow as any).__PlasmicWrapUserFunction = (
              loc: InteractionLoc | InteractionArgLoc,
              fn: () => any,
              args: Record<string, any>
            ) => {
              try {
                if (isInteractionLoc(loc) && loc.actionName === "navigation") {
                  onAnchorClick(`${args.destination}`);
                  return;
                }
                return fn();
              } catch (e) {
                trapInteractionError(studioCtx, loc, e);
                throw e;
              }
            };
            (frameWindow as any).__PlasmicWrapUserPromise = async (
              loc: InteractionLoc | InteractionArgLoc,
              promise: Promise<any>
            ) => {
              try {
                return await promise;
              } catch (e) {
                trapInteractionError(studioCtx, loc, e);
                throw e;
              }
            };

            for (const [_pkg, pkgModule] of await getSortedHostLessPkgs(
              usedPkgs
            )) {
              scriptExec(frameWindow, pkgModule);
            }
            setFrameLoaded(true);
            setDoc(frameWindow.document);
          } catch (err: any) {
            if (!toggleTrailingSlash && err?.name === "SecurityError") {
              console.log(
                "SecurityError while accessing Docs Preview. Trying again..."
              );
              setToggleTrailingSlash(true);
              return;
            }
            throw err;
          }
        }}
        style={{
          width: "100%",
          height: "100%",
          display: error ? "none" : "block",
        }}
      />
      {error && (
        <div className="fill-width fill-height code error-bg p-xlg">
          Error: {error.message}
        </div>
      )}
    </>
  );
});

/**
 * Positions a hover box within `doc` to highlight the rendered
 * element corresponding to `node`.
 */
function repositionHoverBox(
  doc: Document,
  component: Component,
  node: TplNamable | undefined
) {
  /**
   * Get existing highlighter box, or create one if one doesn't exit yet
   */
  const getHoverElt = () => {
    const existing = doc.querySelector(".__plasmic__hover");
    if (existing) {
      return existing as HTMLElement;
    }

    const elt = doc.createElement("div");
    elt.className = "__plasmic__hover";
    elt.style.position = "absolute";
    elt.style.zIndex = "10000";
    elt.style.boxShadow = "0 0 0 2px #04A4F4";
    doc.body.appendChild(elt);
    return elt;
  };

  const hoverElt = getHoverElt();

  if (!node) {
    // Nothing to highlight
    hoverElt.style.display = "none";
    return;
  }

  // For now, we fetch the element corresponding to `node` with this
  // hacky trick -- by re-creating the class name that it would have
  // for the base variant, and querying by it.  We should think about
  // more robust ways of doing this (like, marking elements with an
  // explicit data-plasmic-id attribute in the generated code, etc)
  // The nice-ish thing here is that we don't have to muck with code
  // generation to achieve this.
  const focusedNodeClassName = `${getExportedComponentName(
    component
  )}__${nodeJsName(component, node)}__${toJsIdentifier(
    node.uuid.substring(0, 5)
  )}`;
  const canvasElt = doc.querySelector(`.${focusedNodeClassName}`);

  if (!canvasElt) {
    // Doesn't exist; element not rendered
    hoverElt.style.display = "none";
    return;
  }

  const canvasEltBox = canvasElt.getBoundingClientRect();

  // Position hoverElt at exactly the same location
  hoverElt.style.display = "block";
  hoverElt.style.left = `${canvasEltBox.left}px`;
  hoverElt.style.top = `${canvasEltBox.top}px`;
  hoverElt.style.width = `${canvasEltBox.width}px`;
  hoverElt.style.height = `${canvasEltBox.height}px`;
}
