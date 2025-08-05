import { MenuBuilder } from "@/wab/client/components/menu-builder";
import { reactPrompt } from "@/wab/client/components/quick-modals";
import { Matcher } from "@/wab/client/components/view-common";
import { IFrameAwareDropdownMenu } from "@/wab/client/components/widgets";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { VERT_MENU_ICON } from "@/wab/client/icons";
import PlasmicLeftFontsPanel from "@/wab/client/plasmic/plasmic_kit/PlasmicLeftFontsPanel";
import AlertIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__WarningTriangleSvg";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { StandardMarkdown } from "@/wab/client/utils/StandardMarkdown";
import { swallowClick } from "@/wab/commons/components/ReactUtil";
import { arrayRemove } from "@/wab/shared/collections";
import { Menu, notification, Tooltip } from "antd";
import * as _ from "lodash";
import { observer } from "mobx-react";
import React from "react";

const helpSuffix = `
[Learn how to add custom fonts](https://docs.plasmic.app/learn/custom-fonts).
`;

function _UserManagedFontsPanel(props: {}) {
  const sc = useStudioCtx();
  const missingUsedFonts = sc.fontManager.missingUsedFonts();
  const [query, setQuery] = React.useState("");
  const matcher = new Matcher(query);
  const readOnly = sc.getLeftTabPermission("fonts") === "readable";
  const renderFonts = () => {
    const fonts = sc.site.userManagedFonts.filter((font) =>
      matcher.matches(font)
    );

    const importedFonts = _.uniq(
      sc.site.projectDependencies.flatMap((p) => p.site.userManagedFonts)
    ).filter((font) => matcher.matches(font) && !fonts.includes(font));

    const makeOverlay = (font: string) => {
      const builder = new MenuBuilder();
      if (!readOnly) {
        builder.genSection(undefined, (push) => {
          push(
            <Menu.Item
              key="delete"
              onClick={async () =>
                sc.changeUnsafe(() => {
                  arrayRemove(sc.site.userManagedFonts, font);
                })
              }
            >
              Delete
            </Menu.Item>
          );
        });
      }
      return builder.build({
        onMenuClick: (e) => e.domEvent.stopPropagation(),
        menuName: "custom-font-item-menu",
      });
    };

    const renderFont = (font: string, imported: boolean) => (
      <div className={"SidebarSectionListItem hover-outline"} key={font}>
        <div className={"flex-fill"}>
          <label style={{ marginRight: 3 }}>{font}</label>
          {!sc.fontManager.isUserManagedFontInstalled(font) && (
            <Tooltip title="This font is not available on this computer.">
              <Icon icon={AlertIcon} />
            </Tooltip>
          )}
        </div>

        {!imported ? (
          <IFrameAwareDropdownMenu menu={makeOverlay(font)}>
            <div
              className="SidebarSectionListItem__actionIcon pointer"
              onClick={swallowClick}
            >
              {VERT_MENU_ICON}
            </div>
          </IFrameAwareDropdownMenu>
        ) : (
          <span style={{ fontSize: "85%", opacity: 0.5 }}>(imported)</span>
        )}
      </div>
    );

    return [
      ...fonts.map((font) => renderFont(font, false)),
      ...importedFonts.map((font) => renderFont(font, true)),
    ];
  };

  const addFontFamily = async () => {
    const newFont = await reactPrompt({
      message: `Enter the font-family to use. Plasmic will allow you to use this font in design even if this font is not installed locally.`,
      actionText: "Add",
      placeholder: "Font family...",
      defaultValue: undefined,
    });

    if (!newFont) {
      return;
    }
    if (sc.site.userManagedFonts.find((f) => f === newFont)) {
      notification.warn({
        message: `${newFont} is already in the fonts list`,
      });

      return;
    }
    await sc.changeUnsafe(() => {
      sc.site.userManagedFonts.push(newFont);
    });
    await sc.fontManager.addUserManagedFont(newFont);
  };

  const helpPrefix =
    missingUsedFonts.length > 0
      ? `
The project may not render correctly since the following fonts are missing from your machine:
${missingUsedFonts.map((font) => `- \`${font}\``).join("\n")}\n`
      : "";

  return (
    <PlasmicLeftFontsPanel
      leftSearchPanel={{
        searchboxProps: {
          value: query,
          onChange: (e) => setQuery(e.target.value),
          autoFocus: true,
        },
      }}
      newFontButton={
        readOnly
          ? { render: () => null }
          : {
              onClick: () => addFontFamily(),
            }
      }
      fontsHeader={{
        description: (
          <StandardMarkdown className="flex-col">
            {helpPrefix + helpSuffix}
          </StandardMarkdown>
        ),
      }}
      content={<div className="overflow-scroll-y">{renderFonts()}</div>}
    />
  );
}

export const UserManagedFontsPanel = observer(_UserManagedFontsPanel);
