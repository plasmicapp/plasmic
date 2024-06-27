import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { assert, spawn } from "@/wab/shared/common";
import html2canvas from "html2canvas";

// This the id of the plasmic Chrome extension. You can find it in the details
// page of the extension. Once it is published into Chrome store, we should
// update it.
const plasmicScreenshoterExtId = "ekdpninpaghonjjjikcmffpgbagdjjkh";
let plasmicExtensionInstalled = false;

export const initializePlasmicExtension = () => {
  if (window.chrome && window.chrome.runtime) {
    window.chrome.runtime.sendMessage(
      plasmicScreenshoterExtId,
      { type: "plasmic-check-availability" },
      (response) => {
        if (response) {
          assert(response.data === "plasmic-yes");
          plasmicExtensionInstalled = true;
        }
      }
    );
  }
};

export const plasmicExtensionAvailable = () => {
  return plasmicExtensionInstalled;
};

export const takeScreenshot = (
  sc: StudioCtx,
  iframe: HTMLIFrameElement,
  dom: HTMLElement,
  onScreenshotReady: (
    dataUrl: string | undefined,
    error?: string
  ) => Promise<void>
) => {
  const domRectInFrame = dom.getBoundingClientRect();
  if (domRectInFrame.width === 0 || domRectInFrame.height === 0) {
    spawn(
      onScreenshotReady(
        undefined,
        `no screenshot for width=${domRectInFrame.width}, height=${domRectInFrame.height}`
      )
    );
    return;
  }

  if (!plasmicExtensionInstalled) {
    spawn(
      html2canvas(dom).then((canvas) => {
        const dataUrl = canvas.toDataURL();
        spawn(onScreenshotReady(dataUrl));
      })
    );
    return;
  }
  assert(sc.zoom === 1, "studio zoom must be one in order to take screenshot");

  const framePos = iframe.getBoundingClientRect();
  const req = {
    x: framePos.left + domRectInFrame.left,
    y: framePos.top + domRectInFrame.top,
    width: domRectInFrame.width,
    height: domRectInFrame.height,
    scale: 0.5,
  };
  const oldScreenshoting = sc.screenshotting;
  if (!sc.screenshotting) {
    sc.screenshotting = true;
  }
  window.chrome.runtime.sendMessage(
    plasmicScreenshoterExtId,
    { type: "plasmic-screenshot", data: req },
    function (r) {
      if (r.error) {
        spawn(onScreenshotReady(undefined, r.error));
      } else {
        spawn(onScreenshotReady(`data:image/png;base64,${r.screenshot}`));
      }
      if (oldScreenshoting !== sc.screenshotting) {
        sc.screenshotting = oldScreenshoting;
      }
    }
  );
};
