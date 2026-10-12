import { assert } from "@/wab/shared/common";

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
      },
    );
  }
};

export const plasmicExtensionAvailable = () => {
  return plasmicExtensionInstalled;
};
