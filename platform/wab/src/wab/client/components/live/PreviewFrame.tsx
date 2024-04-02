import { ComponentArena } from "@/wab/classes";
import { trapInteractionError } from "@/wab/client/components/canvas/studio-canvas-util";
import {
  HandlePosition,
  ResizingHandle,
} from "@/wab/client/components/ResizingHandle";
import { getSortedHostLessPkgs } from "@/wab/client/components/studio/studio-bundles";
import { scriptExec } from "@/wab/client/dom-utils";
import { maybeToggleTrailingSlash } from "@/wab/client/utils/app-hosting-utils";
import { ensure, spawn } from "@/wab/common";
import { isPageComponent } from "@/wab/components";
import {
  InteractionArgLoc,
  InteractionLoc,
  isInteractionLoc,
} from "@/wab/exprs";
import { usedHostLessPkgs } from "@/wab/shared/cached-selectors";
import {
  getCustomFrameForActivatedVariants,
  getFrameForActivatedVariants,
} from "@/wab/shared/component-arenas";
import { getPublicUrl } from "@/wab/urls";
import { autorun } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import { useMountedState, usePreviousDistinct } from "react-use";
import { onLoadInjectSystemJS, pushPreviewModules } from "./live-syncer";
import { PreviewCtx } from "./PreviewCtx";

const frameHash = `#live=true&origin=${encodeURIComponent(getPublicUrl())}`;

interface PreviewFrameProps {
  previewCtx: PreviewCtx;
}

interface LivePreview {
  frameRef: React.MutableRefObject<Window | null>;
  onLoad: () => Promise<void>;
  reset: () => void;
}

export function useLivePreview(previewCtx: PreviewCtx): LivePreview {
  const frameRef = React.useRef<Window | null>(null);
  const [frameLoaded, setFrameLoaded] = React.useState(false);

  const usedPkgs = usedHostLessPkgs(previewCtx.studioCtx.site);
  const [installedPkgs, setInstalledPkgs] = React.useState<string[]>([]);
  const [isInstalling, setIsInstalling] = React.useState(false);
  const isMounted = useMountedState();

  const reset = () => {
    frameRef.current = null;
    setInstalledPkgs([]);
    setFrameLoaded(false);
  };

  const scrollToHash = () => {
    if (!frameRef.current || !previewCtx.pageHash) {
      return;
    }

    // We run it in the next-next event loop iteration in case it's still loading.
    // We need TWO setTimeouts for links where both the component and hash change (e.g. /path#anchor).
    // TODO: Trigger the scroll exactly when the anchored element is rendered.
    setTimeout(() => {
      setTimeout(() => {
        const id = previewCtx.pageHash.replace(/^#/, "");
        const anchorElement = frameRef.current?.document.getElementById(id);
        anchorElement?.scrollIntoView();
      }, 0);
    }, 0);
  };

  const onAnchorClick = (href: string) => {
    if (!href) {
      return;
    }

    spawn(previewCtx.handleNavigation(href));
  };

  const onLoad = async () => {
    const frameWindow = ensure(frameRef.current, `Frame must be loaded`);
    await onLoadInjectSystemJS(
      previewCtx.studioCtx,
      frameWindow,
      true,
      onAnchorClick
    );

    (frameWindow as any).__PlasmicWrapUserFunction = (
      loc: InteractionLoc | InteractionArgLoc,
      fn: () => any,
      args: Record<string, any>
    ) => {
      try {
        if (isInteractionLoc(loc) && loc.actionName === "navigation") {
          if (args.destination.startsWith("#")) {
            frameWindow.document
              .getElementById(args.destination.substring(1))
              ?.scrollIntoView({ behavior: "smooth" });
          } else {
            spawn(previewCtx.handleNavigation(`${args.destination}`));
          }
          return;
        }
        return fn();
      } catch (error) {
        trapInteractionError(previewCtx.studioCtx, loc, error);
        throw error;
      }
    };
    (frameWindow as any).__PlasmicWrapUserPromise = async (
      loc: InteractionLoc | InteractionArgLoc,
      promise: Promise<any>
    ) => {
      try {
        return await promise;
      } catch (error) {
        trapInteractionError(previewCtx.studioCtx, loc, error);
        throw error;
      }
    };

    setFrameLoaded(true);
  };

  React.useEffect(() => {
    const installedPkgsSet = new Set(installedPkgs);
    if (!frameLoaded || !frameRef.current || isInstalling) {
      return;
    }
    const win = frameRef.current;
    if (usedPkgs.some((pkg) => !installedPkgsSet.has(pkg))) {
      setIsInstalling(true);
      spawn(
        (async () => {
          const newInstalledPkgs = [...installedPkgs];
          for (const [pkg, pkgModule] of await getSortedHostLessPkgs(
            usedPkgs
          )) {
            if (!installedPkgsSet.has(pkg)) {
              if (!isMounted()) {
                return;
              }
              scriptExec(win, pkgModule);
              newInstalledPkgs.push(pkg);
            }
          }
          if (isMounted()) {
            setInstalledPkgs(newInstalledPkgs);
            setIsInstalling(false);
          }
        })()
      );
    }
  }, [
    frameRef.current,
    frameLoaded,
    usedPkgs,
    installedPkgs,
    isInstalling,
    isMounted,
  ]);

  // Load component in live frame when it's ready or component changes.
  React.useEffect(() => {
    const installedPkgsSet = new Set(installedPkgs);
    if (
      !frameLoaded ||
      !frameRef.current ||
      isInstalling ||
      usedPkgs.some((pkg) => !installedPkgsSet.has(pkg))
    ) {
      return;
    }

    const doc = frameRef.current.document;
    const dispose = pushPreviewModules(doc, previewCtx, { lazy: false });

    // If previewCtx has a hash, scroll frame to it.
    if (previewCtx.pageHash) {
      scrollToHash();
    }

    return () => {
      dispose();
    };
  }, [frameRef.current, frameLoaded, isInstalling, usedPkgs, installedPkgs]);

  // This effect scrolls when the component or hash changes.
  React.useEffect(() => {
    return autorun(() => {
      if (!frameRef.current || (!previewCtx.isLive && !previewCtx.popup)) {
        return;
      }

      if (previewCtx.pageHash) {
        scrollToHash();
      } else {
        frameRef.current.scrollTo(0, 0);
      }
    });
  }, [frameRef.current, previewCtx]);

  return {
    frameRef,
    onLoad,
    reset,
  };
}

export const PreviewFrame = observer(function PreviewFrame(
  props: PreviewFrameProps
) {
  const { previewCtx } = props;
  const studioCtx = previewCtx.studioCtx;

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);
  const { frameRef, onLoad } = useLivePreview(previewCtx);

  const [deltaX, setDeltaX] = React.useState(0);
  const [deltaY, setDeltaY] = React.useState(0);
  const [wrapperWidth, setWrapperWidth] = React.useState(0);

  const [dragging, setDragging] = React.useState(false);
  const [toggleTrailingSlash, setToggleTrailingSlash] = React.useState(false);

  React.useEffect(() => {
    frameRef.current = iframeRef.current?.contentWindow || null;
  }, [iframeRef.current]);

  const ensureMaxViewportSize = () => {
    const wrapper = containerRef.current?.parentElement;
    if (!wrapper || previewCtx.full) {
      return;
    }
    const { width, height } = wrapper.getBoundingClientRect();
    const maxWidth = Math.floor(width - 40);
    const maxHeight = Math.floor(height - 120);

    const newWidth = previewCtx.width > maxWidth ? maxWidth : undefined;
    const newHeight = previewCtx.height > maxHeight ? maxHeight : undefined;
    if (newWidth || newHeight) {
      spawn(
        previewCtx.replaceViewport({
          width: newWidth,
          height: newHeight,
        })
      );
    }
  };

  React.useEffect(() => {
    // Reset delta AFTER width/height change to avoid scrollbars flashing back to original position
    // before width/height change gets propagated to previewCtx.
    setDeltaX(0);
    setDeltaY(0);

    ensureMaxViewportSize();
  }, [previewCtx.width, previewCtx.height, containerRef.current]);

  function setFrameColor(
    iframe: React.MutableRefObject<HTMLIFrameElement | null>,
    color: string | null | undefined
  ) {
    if (iframe?.current?.contentDocument?.body?.style) {
      iframe.current.contentDocument.body.style.backgroundColor = color ?? "";
    }
  }

  const adjustBackgroundColor = () => {
    if (!previewCtx.component || isPageComponent(previewCtx.component)) {
      setFrameColor(iframeRef, null);
      return;
    }
    const componentArena = previewCtx.studioCtx.getDedicatedArena(
      previewCtx.component
    ) as ComponentArena | undefined;
    if (!componentArena) {
      setFrameColor(iframeRef, null);
      return;
    }
    const activeVariants = new Set(previewCtx.getVariants());
    const currentFrame =
      getCustomFrameForActivatedVariants(componentArena, activeVariants) ??
      getFrameForActivatedVariants(componentArena, activeVariants);

    setFrameColor(iframeRef, currentFrame?.bgColor);
  };

  React.useEffect(() => {
    adjustBackgroundColor();
  }, [
    previewCtx.component,
    previewCtx.variants,
    previewCtx.global,
    iframeRef.current?.contentDocument?.body,
  ]);

  const previousComponent = usePreviousDistinct(previewCtx.component);
  const adjustPreviewSize = () => {
    if (!previewCtx.component) {
      return;
    }
    if (
      previousComponent &&
      isPageComponent(previousComponent) &&
      isPageComponent(previewCtx.component)
    ) {
      return;
    }
    const arena = previewCtx.studioCtx.getDedicatedArena(previewCtx.component);
    if (!arena) {
      return;
    }

    if (arena.matrix.rows.length > 0 && arena.matrix.rows[0].cols.length > 0) {
      const frame = arena.matrix.rows[0].cols[0].frame;
      spawn(
        previewCtx.replaceViewport({
          height: frame.height,
          width: frame.width,
        })
      );
    }
  };

  React.useEffect(() => {
    adjustPreviewSize();
  }, [previewCtx.component]);

  // Set wrapperWidth according to browser resizing.
  const wrapperObserver = new ResizeObserver(
    (entries: ResizeObserverEntry[]) => {
      setWrapperWidth(entries[0].contentRect.width);
      ensureMaxViewportSize();
    }
  );
  React.useEffect(() => {
    const wrapper = containerRef.current?.parentElement;
    if (wrapper) {
      wrapperObserver.observe(wrapper);
    }
    return () => {
      if (wrapper) {
        wrapperObserver.unobserve(wrapper);
      }
    };
  }, [containerRef.current]);

  const onStartDragging = () => {
    setDragging(true);
  };

  const onStopDragging = () => {
    setDragging(false);
    spawn(
      previewCtx.pushViewport({
        width: previewCtx.width + deltaX * 2,
        height: previewCtx.height + deltaY,
      })
    );
  };

  const onDrag = ({ deltaX: newDeltaX = 0, deltaY: newDeltaY = 0 }) => {
    if (!containerRef.current) {
      return;
    }

    setDeltaX(newDeltaX);
    setDeltaY(newDeltaY);
  };

  const adjustedWidth = previewCtx.width + deltaX * 2;
  const adjustedHeight = previewCtx.height + deltaY;
  const adjustedLeft = (wrapperWidth - adjustedWidth) / 2;
  const style = previewCtx.full
    ? {
        width: "100%",
        height: "100%",
        left: 0,
        top: 0,
      }
    : {
        width: adjustedWidth,
        height: adjustedHeight,
        left: adjustedLeft,
        top: 100,
      };

  return (
    <div
      className="CanvasFrame__Container CanvasFrame__Container--live"
      ref={containerRef}
      style={{
        display: "block",
        ...style,
      }}
    >
      <iframe
        src={
          maybeToggleTrailingSlash(
            toggleTrailingSlash,
            studioCtx.getHostUrl()
          ) + frameHash
        }
        ref={iframeRef}
        onLoad={async () => {
          try {
            await onLoad();
          } catch (e: any) {
            if (!toggleTrailingSlash && e?.name === "SecurityError") {
              console.log(
                "SecurityError while accessing preview frame. Trying again..."
              );
              setToggleTrailingSlash(true);
              return;
            }
            throw e;
          }
        }}
        style={{
          width: "100%",
          height: "100%",
          userSelect: "none",
        }}
        data-test-id="live-frame"
      />
      {
        // This cover is put on top of the iframe when the container is being
        // resized so that the dragEnd event is handled by ResizingHandler.
        !previewCtx.full && dragging && <div className="CanvasFrame__Cover" />
      }
      {!previewCtx.full &&
        [HandlePosition.bottom, HandlePosition.left, HandlePosition.right].map(
          (pos) => (
            <ResizingHandle
              key={`${pos}.${previewCtx.width}.${previewCtx.height}`}
              position={pos}
              zoom={1}
              onDrag={onDrag}
              onStartDragging={onStartDragging}
              onStopDragging={onStopDragging}
              size={
                pos === HandlePosition.bottom
                  ? iframeRef.current?.offsetWidth
                  : iframeRef.current?.offsetHeight
              }
            />
          )
        )}
    </div>
  );
});
