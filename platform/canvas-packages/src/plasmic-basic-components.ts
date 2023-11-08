import {
  registerConditionGuard,
  registerDataProvider,
  registerEmbed,
  registerIframe,
  registerSideEffect,
  registerTimer,
  registerVideo,
} from "@plasmicpkgs/plasmic-basic-components";

export function register() {
  registerIframe();
  registerVideo();
  registerEmbed();
  registerDataProvider();
  registerConditionGuard();
  registerSideEffect();
  registerTimer();
}

register();
