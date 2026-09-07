import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { RuleSetHelpers } from "@/wab/shared/RuleSetHelpers";
import { Theme } from "@/wab/shared/model/classes";

export function activateTheme(studioCtx: StudioCtx, theme: Theme) {
  if (studioCtx.site.activeTheme === theme) {
    return;
  }
  studioCtx.site.activeTheme = theme;
  // get() would fall back to "initial", which useFont registers as a missing
  // font.
  const fontFamily = new RuleSetHelpers(theme.defaultStyle.rs, "div").getRaw(
    "font-family"
  );
  if (fontFamily) {
    studioCtx.fontManager.useFont(studioCtx, fontFamily);
  }
}
