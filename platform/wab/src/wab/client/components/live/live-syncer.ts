import {
  absorbLinkClick,
  showCanvasAuthNotification,
} from "@/wab/client/components/canvas/studio-canvas-util";
import { SubDeps } from "@/wab/client/components/canvas/subdeps";
import { PreviewCtx } from "@/wab/client/components/live/PreviewCtx";
import { buildPreviewUpdate } from "@/wab/client/components/live/preview-codegen";
import {
  liveFrame,
  syncPreview,
} from "@/wab/client/components/live/preview-sync";
import {
  getLiveFrameClientJs,
  getReactWebBundle,
} from "@/wab/client/components/studio/studio-bundles";
import { scriptExec } from "@/wab/client/dom-utils";
import { PlasmicWindowInternals } from "@/wab/client/frame-ctx/windows";
import { requestIdleCallback } from "@/wab/client/requestidlecallback";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { VariantCombo } from "@/wab/shared/Variants";
import { getBuiltinComponentRegistrations } from "@/wab/shared/code-components/builtin-code-components";
import { withTimeout } from "@/wab/shared/common";
import * as Sentry from "@sentry/browser";
import L from "lodash";
import { autorun, untracked } from "mobx";

const LIVE_HOST_TIMEOUT_MS = 3 * 60 * 1000;

export function pushPreviewModules(
  win: Window,
  previewCtx: PreviewCtx,
  opts: { lazy?: boolean },
) {
  const scheduler = opts.lazy
    ? (run: () => void) => requestIdleCallback(run)
    : undefined;
  const disposeRun = syncPreview(
    win,
    () => {
      if (!previewCtx.previewData) {
        return undefined;
      }
      return buildPreviewUpdate(previewCtx.studioCtx, {
        component: previewCtx.component,
        previewPath: previewCtx.previewPath,
        variants: untracked(() => previewCtx.variants),
        globals: untracked(() => previewCtx.global),
        pageParams: previewCtx.pageParams,
        pageQuery: previewCtx.pageQuery,
        appUser: {
          user: previewCtx.studioCtx.currentAppUser,
          userAuthToken: previewCtx.studioCtx.currentAppUserCtx.fakeAuthToken,
        },
      });
    },
    (error) => {
      if (error) {
        console.error("Live frame refresh error", error);
        Sentry.captureException(error);
      }
    },
    { name: "liveUpdate", scheduler },
  );

  // Variant changes update state without remounting the preview.
  let curVariants: VariantCombo = previewCtx.getVariants();
  const disposeVariants = autorun(
    () => {
      if (!L.isEqual(curVariants, previewCtx.getVariants())) {
        liveFrame(win).setGlobals(previewCtx.global);
        liveFrame(win).setProps(previewCtx.variants);
        curVariants = previewCtx.getVariants();
      }
    },
    { name: "liveUpdateVariants", scheduler },
  );
  return () => {
    disposeRun();
    disposeVariants();
  };
}

export async function onLoadInjectLiveRuntime(
  studioCtx: StudioCtx,
  frameWindow: Window,
  captureExceptions = true,
  onAnchorClick?: (href: string) => void,
) {
  await waitForLiveHost(frameWindow);
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
    }),
  );
  (frameWindow as any).__PLASMIC__ = {
    EXECUTE_SERVER_QUERY: studioCtx.executeServerQuery,
  } as PlasmicWindowInternals;
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
  (
    frameWindow as unknown as { __Sub: SubDeps }
  ).__Sub.hostUtils.registerRenderErrorListener((error: Error) => {
    console.error("Live frame render error", error);
    if (captureExceptions) {
      Sentry.captureException(error);
    }
  });
}

// The host can load `@plasmicapp/host` after the frame's load event.
async function waitForLiveHost(win: Window) {
  const isReady = () =>
    !!(win as any).__Sub && !!win.document.querySelector(".__wab_user-body");
  if (isReady()) {
    return;
  }
  let cleanup = () => {
    /* */
  };
  try {
    await withTimeout(
      new Promise<void>((resolve) => {
        const check = () => isReady() && resolve();
        const observer = new MutationObserver(check);
        observer.observe(win.document, { childList: true, subtree: true });
        // MutationObserver sometimes stops firing in Chrome
        const intervalId = window.setInterval(check, 500);
        cleanup = () => {
          observer.disconnect();
          window.clearInterval(intervalId);
        };
      }),
      "Couldn't find the live preview host",
      LIVE_HOST_TIMEOUT_MS,
    );
  } finally {
    cleanup();
  }
}

function swallowAnchorClicks(
  doc: Document,
  onAnchorClick?: (href: string) => void,
) {
  // Listen in the capture phase so we catch clicks even if a child
  // component (like a button) calls stopPropagation.
  doc.body.addEventListener(
    "click",
    (e) => absorbLinkClick(e, onAnchorClick),
    true,
  );
}
