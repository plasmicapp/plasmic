import { activateTheme } from "@/wab/client/activate-theme";
import PlasmicLeftThemesPanel from "@/wab/client/plasmic/plasmic_kit_left_pane/PlasmicLeftThemesPanel";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ensure } from "@/wab/shared/common";
import { getSelectableThemes } from "@/wab/shared/core/theme-styles";
import { observer } from "mobx-react";
import React from "react";

export const DefaultStylesPanel = observer(function DefaultStylesPanel() {
  const studioCtx = useStudioCtx();
  const site = studioCtx.site;
  const activeTheme = site.activeTheme;
  const themes = getSelectableThemes(site).map((st) => st.theme);

  return (
    <PlasmicLeftThemesPanel
      noThemePicker={themes.length <= 1}
      themeSelector={{
        props: {
          options: themes.map((theme) => ({
            value: theme.defaultStyle.uuid,
            label: studioCtx.tplMgr().isOwnedBySite(theme)
              ? "This project's theme"
              : `Theme from ${
                  ensure(
                    studioCtx.projectDependencyManager.getOwnerDep(theme),
                    "Could not find owner dep for theme"
                  ).name
                }`,
          })),
          value: activeTheme ? activeTheme.defaultStyle.uuid : undefined,
          onChange: async (newVal) => {
            const theme = themes.find((th) => th.defaultStyle.uuid === newVal);
            if (theme && theme !== activeTheme) {
              await studioCtx.changeUnsafe(() => {
                activateTheme(studioCtx, theme);
              });
            }
          },
        },
      }}
      notOwnedBySite={!!activeTheme && !site.themes.includes(activeTheme)}
    />
  );
});

export default DefaultStylesPanel;
