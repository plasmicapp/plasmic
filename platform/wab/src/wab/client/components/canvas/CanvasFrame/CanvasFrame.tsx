import { DragMoveFrameManager } from "@/wab/client/FreestyleManipulator";
import { CanvasActions } from "@/wab/client/components/canvas/CanvasActions/CanvasActions";
import { CanvasArtboardSelectionHandle } from "@/wab/client/components/canvas/CanvasFrame/CanvasArtboardSelectionHandle";
import styles from "@/wab/client/components/canvas/CanvasFrame/CanvasFrame.module.scss";
import { CanvasHeader } from "@/wab/client/components/canvas/CanvasFrame/CanvasHeader";
import { headRegexp } from "@/wab/client/components/canvas/CanvasFrame/headRegexp";
import { CanvasCtx } from "@/wab/client/components/canvas/canvas-ctx";
import {
  absorbLinkClick,
  closestTaggedNonTextDomElt,
  showCanvasPageNavigationNotification,
} from "@/wab/client/components/canvas/studio-canvas-util";
import { CanvasCommentMarkers } from "@/wab/client/components/comments/CanvasCommentMarkers";
import { bindShortcutHandlers } from "@/wab/client/shortcuts/shortcut-handler";
import { STUDIO_SHORTCUTS } from "@/wab/client/shortcuts/studio/studio-shortcuts";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ScreenDimmer } from "@/wab/commons/components/ScreenDimmer";
import {
  XDraggable,
  XDraggableEvent,
} from "@/wab/commons/components/XDraggable";
import { AsyncGeneratorReturnType } from "@/wab/commons/types";
import { AnyArena, getArenaName, getFrameHeight } from "@/wab/shared/Arenas";
import { siteToAllGlobalVariants } from "@/wab/shared/cached-selectors";
import {
  toClassName,
  toJsIdentifier,
  toVarName,
} from "@/wab/shared/codegen/util";
import {
  assert,
  cx,
  ensure,
  spawn,
  spawnWrapper,
  tuple,
} from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { Pt } from "@/wab/shared/geom";
import { ArenaFrame } from "@/wab/shared/model/classes";
import { getPublicUrl } from "@/wab/shared/urls";
import { Spin } from "antd";
import $ from "jquery";
import L from "lodash";
import { reaction } from "mobx";
import { observer } from "mobx-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMountedState, useUnmount } from "react-use";

interface CanvasFrameProps {
  studioCtx: StudioCtx;
  onFrameLoad: (frame: ArenaFrame, canvasCtx: CanvasCtx) => void;
  arena: AnyArena;
  arenaFrame: ArenaFrame;
  isFree: boolean;
}

export const CanvasFrame = observer(function CanvasFrame({
  arena,
  arenaFrame,
  isFree,
  onFrameLoad,
  studioCtx,
}: CanvasFrameProps) {
  const [createdVc, setCreatedVc] = useState(false);
  const [iFrameKey, setIFrameKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const canvasName = `Canvas[${getArenaName(arena)}][${arenaFrame.uid}]`;
  const [toggleTrailingSlash, setToggleTrailingSlash] = useState(false);

  // We want to only load one CanvasFrame at a time, so we let StudioCtx
  // help us coordinate.  The load states are:
  // - unloaded: frame was first created
  // - queued: we've queued our load request, and is now waiting for our
  //   request to be served
  // - ready-to-load: our load request is being served, time to initiate load
  // - loading: we've written the host html to the iframe doc, now
  //   waiting for the onLoad event
  // - loaded: our iframe onLoad has finished executing.
  const isMounted = useMountedState();
  const [loadState, setLoadState] = useState<
    "unloaded" | "queued" | "ready-to-load" | "loading" | "loaded"
  >("unloaded");
  const [initState, setInitState] = useState<
    AsyncGeneratorReturnType<CanvasCtx["initViewPort"]> | undefined
  >(undefined);
  const loadedResolveRef = useRef<(() => void) | null>(null);
  const disposeRef = useRef(() => {});
  useEffect(() => {
    if (loadState === "unloaded") {
      studioCtx.queueCanvasFrame({
        load: () =>
          new Promise<void>((resolve) => {
            if (isMounted()) {
              setLoadState("ready-to-load");
              // We save the resolve for later, at the end of onLoad()
              loadedResolveRef.current = resolve;
            } else {
              // This canvas frame has been unmounted in the mean time,
              // so just forget about it and resolve immediately.
              resolve();
            }
          }),
        arena,
        name: canvasName,
      });
      setLoadState("queued");
    }
  }, [loadState, canvasName]);

  const maybeViewCtx = useCallback(
    () => studioCtx.tryGetViewCtxForFrame(arenaFrame),
    [studioCtx, arenaFrame]
  );
  const viewCtx = useCallback(
    () => ensure(maybeViewCtx(), () => "Expected viewCtx to exist"),
    [maybeViewCtx]
  );
  const canvasCtx = useCallback(() => viewCtx().canvasCtx, [viewCtx]);

  const needsToRecreateVc = createdVc && !maybeViewCtx();

  useEffect(() => {
    if (needsToRecreateVc) {
      // force iframe to reload
      setIFrameKey(iFrameKey + 1);
      setCreatedVc(false);
    }
  }, [needsToRecreateVc]);

  useUnmount(() => {
    const vc = maybeViewCtx();
    if (vc) {
      studioCtx.disposeViewCtx(vc);
    }
  });

  const handleLoad = useCallback(
    async (viewport: HTMLIFrameElement) => {
      if (loadState === "unloaded" || loadState === "queued") {
        return;
      }

      const $viewport = $(viewport);
      const vc = maybeViewCtx();
      const ctx = vc ? vc.canvasCtx : createCanvasCtx($viewport, canvasName);
      try {
        for await (const initState_ of ctx.initViewPort(
          $viewport,
          arenaFrame,
          studioCtx
        )) {
          setInitState(initState_);
        }
      } catch (e: any) {
        if (!toggleTrailingSlash && e?.name === "SecurityError") {
          console.log(
            "SecurityError while accessing artboard. Trying again..."
          );
          setToggleTrailingSlash(true);
          return;
        }
        throw e;
      }

      const onFocus = () => {
        if (
          !viewCtx().viewOps.isEditing() &&
          studioCtx.isDevMode &&
          !studioCtx.isInteractiveMode
        ) {
          viewCtx().canvasCtx.viewport().blur();
        }
      };

      const onWheel = (e: WheelEvent) => {
        const [topClientX, topClientY] = getTopClientPt(e);
        studioCtx.handleWheel(e, topClientX, topClientY);
      };

      const handleDoubleClick = (e: JQuery.DoubleClickEvent) => {
        if (
          studioCtx.isInteractiveMode ||
          viewCtx().viewOps.isEditing(e.target)
        ) {
          // If we're in interactive mode or currently editing the event target,
          // then let the browser handle the interaction
          return;
        }

        const actualTarget: HTMLElement = isCanvasOverlay($(e.target))
          ? canvasCtx().getActualTargetUnderCanvasOverlay(e.clientX, e.clientY)
          : e.target;

        const $target = $(actualTarget);
        if (
          !(
            $target.is(canvasCtx().$userBody()) ||
            $target.is(canvasCtx().$html())
          )
        ) {
          const closest = closestTaggedNonTextDomElt($target, viewCtx(), {
            excludeNonSelectable: true,
          });
          viewCtx().viewOps.deepFocusElement(closest, "dbl-click");
        }
        e.preventDefault();
        e.stopPropagation();
      };

      const handleKeyUp = (e: JQuery.KeyUpEvent) => {
        if (studioCtx.isInteractiveMode) {
          return;
        }
        if (!viewCtx().editingTextContext()) {
          studioCtx.markKeyup(e.which);
        }
      };

      const handleKeyDown = (e: JQuery.KeyDownEvent) => {
        if (studioCtx.isInteractiveMode) {
          return;
        }
        if (!viewCtx().editingTextContext()) {
          studioCtx.markKeydown(e.which);
        }
      };

      const absorbEvent = (e: JQuery.UIEventBase | Event) => {
        if (!maybeViewCtx()) {
          return;
        }

        if (studioCtx.isLiveMode || studioCtx.isInteractiveMode) {
          if (e.type === "click") {
            absorbLinkClick(e, (href) =>
              showCanvasPageNavigationNotification(viewCtx().studioCtx, href)
            );
          }

          return;
        }

        // When a user e.g. clicks a link in the canvas, we don't want to follow it,
        // so we we always suppress default events.  The one exception is when a
        // user starts editing a text span---we want them to be able to click to
        // move the cursor around, so we have to enable mouseup events (but only for
        // that specific edited element).  We're just lucky that mouseup is what
        // moves the cursor while click is what triggers most default actions (like
        // following links).
        e.stopPropagation();
        if (!(e.type === "mouseup" && viewCtx().viewOps.isEditing(e.target))) {
          return e.preventDefault();
        }
      };

      // Prevent the frame from ever receiving focus.  We generally won't get
      // here
      // because the mousedown handler in the iframe also controls the focus.
      ctx.viewport().addEventListener("focus", onFocus);
      // We need to prevent event defaults / stop propagations from reaching the
      // actual components in the canvas - in editing mode, we don't want them
      // responding to clicks/hovers/etc.  But we don't need to do this from
      // *capture* events - we can just rely on normal event bindings here, so
      // long as they are attached to something beneath the document (in this
      // case, the $html).  This is because React's event listeners all
      // attach to the document, and since document is at a higher level than
      // $html, $html's events fire first.
      ctx
        .$html()
        .on("keydown", handleKeyDown)
        .on("keyup", handleKeyUp)
        .on("dblclick", handleDoubleClick)
        .on("mouseup", absorbEvent)
        .on("mouseover", absorbEvent)
        .on("mouseout", absorbEvent)
        .on("click", absorbEvent);

      const unbindShortcutHandlers = bindShortcutHandlers(
        ctx.$html().get(0),
        STUDIO_SHORTCUTS,
        {
          TOGGLE_INTERACTIVE_MODE: () => {
            studioCtx.isInteractiveMode = false;
          },
        }
      );

      // On Chrome, wheel event on iframe's window/body/html/document cannot be
      // prevented/stopped. Also, the event is not bubbled to parent. See
      // https://www.chromestatus.com/features/6662647093133312 for more details.
      // So we make the body cover the entire iframe to capture the event
      // and absorb it.
      // We cannot register wheel handler using React's onWheel property - the
      // wheel event is now passive by default in Chrome, which means we cannot
      // call preventDefault on it.
      ctx.$html().get(0).addEventListener("wheel", onWheel, { passive: false });

      studioCtx.fontManager.installAllUsedFonts([ctx.$head()]);
      onFrameLoad(arenaFrame, ctx);

      setCreatedVc(true);
      setLoadState("loaded");
      if (loadedResolveRef.current) {
        loadedResolveRef.current();
        loadedResolveRef.current = null;
      }

      disposeRef.current = () => {
        console.log("new dispose");
        ctx
          .$html()
          .off("keydown", handleKeyDown)
          .off("keyup", handleKeyUp)
          .off("dblclick", handleDoubleClick)
          .off("mouseup", absorbEvent)
          .off("mouseover", absorbEvent)
          .off("mouseout", absorbEvent)
          .off("click", absorbEvent);
        unbindShortcutHandlers();
        ctx.$html().get(0).removeEventListener("wheel", onWheel);
        ctx.viewport().removeEventListener("focus", onFocus);
        ctx.dispose();
        loadedResolveRef.current?.();
      };
    },
    [
      studioCtx,
      viewCtx,
      maybeViewCtx,
      arenaFrame,
      loadState,
      toggleTrailingSlash,
      onFrameLoad,
    ]
  );

  useEffect(() => {
    return () => {
      disposeRef.current();
    };
  }, []);

  // Get the coordinate of a mouse event (that targeted element inside the frame
  // for vc) in the top most window.

  const getTopClientPt = useCallback(
    (frameEvent: WheelEvent) => {
      // NOTE: the below commented out implementation attempts to compute the
      // pointer position with respect to the top-level page by looking at screen
      // positions and window sizes.  However, this was unreliable because there's
      // no way to get exactly where the viewport is within the window (the window can
      // have other chrome, like the URL bar, the devtools panel, etc), so this was
      // just an approximation.  The current implementation tries to compute this by
      // looking at the event's clientX/Y instead.  This is also inprecise, as clientX/Y
      // are integer-precision values, and when you're zoomed in, will not give you the
      // exact position of your cursor.  But for the purpose of doing zooming, this
      // is "good enough", and safer than using the screenX/screenY.

      // TODO: fix this hack. We can learn about the screen position of the
      // topmost viewport from a mouse event inside the iframe when scale is 1 or
      // any mouse event outside the iframe. This works when the topmost scale
      // is 1. When the topmost scale is not one, we have to just do a best
      // effort based on the toplevel window's scale.
      // clientX/clientY in topmost window. We cannot use e.clientX and e.clientY
      // because they are not scaled. This is hacky though - we are assuming the
      // browser window doesn't have fixed tab at the left and bottom. The problem
      // is that we don't know the position of the viewport inside the browser.
      // const clientX = frameEvent.screenX - window.screenX;
      // const clientY =
      //   frameEvent.screenY -
      //   window.screenY -
      //   (window.outerHeight - window.innerHeight);

      const frameBB = viewCtx().canvasCtx.viewport().getBoundingClientRect();
      const clientX = frameEvent.clientX * studioCtx.zoom + frameBB.left;
      const clientY = frameEvent.clientY * studioCtx.zoom + frameBB.top;
      return tuple(clientX, clientY);
    },
    [studioCtx]
  );

  const handleSelectionClick = useCallback(() => {
    if (studioCtx.isInteractiveMode) {
      return;
    }
    spawn(
      studioCtx.change(({ success }) => {
        studioCtx.setStudioFocusOnFrame({ frame: arenaFrame });
        return success();
      })
    );
  }, [studioCtx]);
  const handleArenaHandleClick = useCallback(() => {
    if (studioCtx.isInteractiveMode) {
      return;
    }
    spawn(
      studioCtx.change(({ success }) => {
        studioCtx.setStudioFocusOnlyOnFrame(arenaFrame);
        return success();
      })
    );
  }, [studioCtx]);

  const dragMoveManager = useRef<DragMoveFrameManager | undefined>(undefined);

  const startMove = (e: XDraggableEvent) => {
    const clientPt = new Pt(e.mouseEvent.pageX, e.mouseEvent.pageY);
    if (studioCtx.isPositionManagedFrame(arenaFrame)) {
      return;
    }
    dragMoveManager.current = new DragMoveFrameManager(
      studioCtx,
      arenaFrame,
      clientPt
    );

    if (dragMoveManager.current && dragMoveManager.current.aborted()) {
      dragMoveManager.current = undefined;
    } else {
      studioCtx.setIsDraggingObject(true);
    }
  };

  const dragMove = async (e: XDraggableEvent) => {
    if (dragMoveManager.current) {
      if (dragMoveManager.current.aborted()) {
        await stopMove();
      } else {
        const clientPt = new Pt(e.mouseEvent.pageX, e.mouseEvent.pageY);
        await dragMoveManager.current.drag(clientPt, e.mouseEvent);
        if (dragMoveManager.current && dragMoveManager.current.aborted()) {
          await stopMove();
        }
      }
    }
  };

  const stopMove = async () => {
    await studioCtx.change(({ success }) => {
      if (dragMoveManager.current) {
        dragMoveManager.current.endDrag();
        dragMoveManager.current = undefined;
      }
      studioCtx.setIsDraggingObject(false);
      return success();
    });
  };

  useEffect(() => {
    if (loadState === "ready-to-load" && iframeRef.current) {
      const viewport = iframeRef.current;
      spawn(
        (async () => {
          const html = await studioCtx.hostPageHtml;
          const doc = ensure(
            viewport.contentDocument,
            () => "Expected contentDocument to exist"
          );

          /*
            This is a workaround for fixing an issue with gatsby's dev mode error handler.
            - https://app.shortcut.com/plasmic/story/27150/app-hosting-with-gatsby-is-not-working

            Plasmic's canvas host iframe is a sourceless iframe so it's treated as a sandboxed iframe,
            the browser throws an error when trying to register or read service workers from it,
            this error is not handled gracefully by gatsby and it causes the canvas frames to crash
            and render a blank page.

            We're patching the getRegistrations call to return an empty array so the call
            doesn't crash the page.
          */
          const gatsbyDevModeServiceWorkerFixScript = `
            (() => {
              const original = navigator.serviceWorker.getRegistrations;
              navigator.serviceWorker.getRegistrations = () => {
                // Detecting if this is a gatsby site.
                if (window._gatsbyEvents) {
                  return Promise.resolve([]);
                }

                // Otherwise use the original implementation.
                return original.call(navigator.serviceWorker);
              };
            })();
          `;

          const finalHtml = html.replace(
            headRegexp,
            `$&
            <script>
              ${gatsbyDevModeServiceWorkerFixScript}

              window.history.replaceState({}, "", "${
                new URL(studioCtx.getHostUrl()).pathname + `#${makeFrameHash()}`
              }");
              !function(){const n=window,i="__REACT_DEVTOOLS_GLOBAL_HOOK__",o="__PlasmicPreambleVersion",t=function(){};
              if(void 0!==n){if(n.parent!==n)try{n[i]=n.parent[i]}catch(e){}if(!n[i]){const r=new Map
              n[i]={supportsFiber:!0,renderers:r,inject:function(n){r.set(r.size+1,n)},onCommitFiberRoot:t,onCommitFiberUnmount:t}}n[i][o]||(n[i][o]="1")}}()
              window.__PLASMIC_ARTBOARD = true;
            </script>
          `
          );
          if (html.length === finalHtml.length) {
            reportError(
              "Failed to inject Plasmic script into canvas host frame."
            );
            return;
          }

          doc.open();
          doc.write(finalHtml);
          doc.close();
          setLoadState("loading");

          if (doc.readyState === "complete") {
            await handleLoad(viewport);
          } else {
            const listener = spawnWrapper(async () => {
              if (doc.readyState === "complete") {
                await handleLoad(viewport);
                doc.removeEventListener("readystatechange", listener);
              }
            });
            doc.addEventListener("readystatechange", listener);
          }
        })()
      );
    }
  }, [loadState]);

  const makeFrameHash = React.useCallback(() => {
    const globalVariantMap = L.keyBy(
      siteToAllGlobalVariants(studioCtx.site),
      (v) => v.uuid
    );
    const activeGlobalVariants = Object.fromEntries(
      L.uniq([
        ...Object.entries(arenaFrame.pinnedGlobalVariants)
          .filter(([_, pin]) => pin)
          .map(([key]) =>
            ensure(
              globalVariantMap[key],
              `Globat variant with uuid ${key} not found.`
            )
          ),
        ...arenaFrame.targetGlobalVariants,
      ]).map((variant) => {
        assert(
          variant.parent,
          "Global variant should belong to a VariantGroup"
        );
        const globalVariantGroupName = toJsIdentifier(
          variant.parent.param.variable.name
        );
        const globalVariantName = toVarName(variant.name);
        return [globalVariantGroupName, globalVariantName];
      })
    );
    const hash = new URLSearchParams({
      canvas: "true",
      origin: getPublicUrl(),
      componentName: toClassName(arenaFrame.container.component.name),
      globalVariants: JSON.stringify(activeGlobalVariants),
      interactive: `${studioCtx.isInteractiveMode}`,
    }).toString();
    return hash;
  }, [studioCtx, arenaFrame]);

  useEffect(() => {
    const dispose = reaction(
      () => {
        return makeFrameHash();
      },
      (hash) => {
        if (
          iframeRef.current?.contentWindow &&
          hash !== iframeRef.current.contentWindow.location.hash
        ) {
          iframeRef.current.contentWindow.location.hash = hash;
        }
      }
    );
    return () => dispose();
  }, [makeFrameHash, iframeRef.current]);

  return (
    <div className={styles.root} onClick={handleSelectionClick}>
      {maybeViewCtx()?.canvasCtx.isUpdatingCcRegistry() &&
        createPortal(
          <ScreenDimmer>
            <Spin size={"large"} />
          </ScreenDimmer>,
          document.body
        )}
      <div
        className={"CanvasFrame__Container"}
        style={
          isFree
            ? {
                position: "absolute",
                left: ensure(
                  arenaFrame.left,
                  () => "Expected arenaFrame.left to exist"
                ),
                top: ensure(
                  arenaFrame.top,
                  () => "Expected arenaFrame.top to exist"
                ),
                width: arenaFrame.width,
                height: getFrameHeight(arenaFrame),
              }
            : {
                width: arenaFrame.width,
                height: getFrameHeight(arenaFrame),
              }
        }
        data-frame-id={`${arenaFrame.uid}`}
      >
        <iframe
          className={cx(
            "canvas-editor__viewport",
            loadState !== "loaded" && "no-pointer-events"
          )}
          data-test-frame-uid={
            loadState === "unloaded" || loadState === "queued"
              ? undefined
              : arenaFrame.uid
          }
          ref={iframeRef}
          key={
            iFrameKey +
            String(loadState === "unloaded" || loadState === "queued")
          }
        />
        <div
          className={"CanvasFrame__OverlayTop"}
          data-frame-uid={arenaFrame.uid}
        />
        <div
          className={"CanvasFrame__OverlayRight"}
          data-frame-uid={arenaFrame.uid}
        />
        <div
          className={"CanvasFrame__OverlayBottom"}
          data-frame-uid={arenaFrame.uid}
        />
        <div
          className={"CanvasFrame__OverlayLeft"}
          data-frame-uid={arenaFrame.uid}
        />
        {DEVFLAGS.loadingDebug && (
          <div className={styles.statusBadge}>
            {loadState === "unloaded" && "Mounted..."}
            {loadState === "queued" && "Queued to be loaded..."}
            {loadState === "ready-to-load" && "Waiting to be loaded..."}
            {loadState === "loading" && "Loading host..."}
            {initState === "user-body-wait" &&
              "Waiting for host to render <PlasmicCanvasHost />..."}
            {initState === "script-wait" && "Executing artboard scripts..."}
            {initState === "hostless-wait" &&
              "Installing built-in comopnent packages..."}
            {initState === "done" && "Loaded"}
          </div>
        )}

        <CanvasHeader studioCtx={studioCtx} frame={arenaFrame} arena={arena} />
        <XDraggable
          onStart={(e) => startMove(e)}
          onDrag={(e) => dragMove(e)}
          onStop={async () => stopMove()}
        >
          <span>
            <CanvasArtboardSelectionHandle
              frame={arenaFrame}
              onClick={handleArenaHandleClick}
            />
          </span>
        </XDraggable>
        {!studioCtx.isInteractiveMode &&
          studioCtx.showComments() &&
          studioCtx.showCommentsOverlay && (
            <CanvasCommentMarkers arena={arena} arenaFrame={arenaFrame} />
          )}
        {studioCtx.appCtx.appConfig.warningsInCanvas && (
          <CanvasActions arena={arena} arenaFrame={arenaFrame} />
        )}
      </div>
    </div>
  );
});

function createCanvasCtx($viewport: JQuery<HTMLIFrameElement>, name: string) {
  return new CanvasCtx({
    $viewport,
    name,
  });
}

export function isCanvasOverlay($target: JQuery) {
  return $target.is(".__wab_canvas_overlay");
}
