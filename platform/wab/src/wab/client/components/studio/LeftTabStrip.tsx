// eslint-disable-next-line no-restricted-imports
import { showTemporaryInfo } from "@/wab/client/components/quick-modals";
import { AnonymousAvatar, Avatar } from "@/wab/client/components/studio/Avatar";
import { FigmaModalContent } from "@/wab/client/components/studio/FigmaModalContent";
import LeftTabButton from "@/wab/client/components/studio/LeftTabButton";
import { isIntercomEnabled } from "@/wab/client/intercom";
import GearIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Gear";
import MixinIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Mixin";
import SlackIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Slack";
import TreeIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Tree";
import WandIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Wand";
import KeyboardIcon from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__Keyboard";
import BooksvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__BookSvg";
import ChatDocssvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__ChatDocsSvg";
import ClocksvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__ClockSvg";
import ComponentsvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__ComponentSvg";
import ComponentssvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__ComponentsSvg";
import DevicessvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__DevicesSvg";
import DotsHorizontalCirclesvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__DotsHorizontalCircleSvg";
import DownloadsvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__DownloadSvg";
import FigmasvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__FigmaSvg";
import FontFamily2SvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__FontFamily2Svg";
import HelpCirclesvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__HelpCircleSvg";
import HelpsvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__HelpSvg";
import MessagesvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__MessageSvg";
import Paintbrush2SvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__Paintbrush2Svg";
import PhotosvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__PhotoSvg";
import WarningTrianglesvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__WarningTriangleSvg";
import {
  DefaultLeftTabStripProps,
  PlasmicLeftTabStrip,
} from "@/wab/client/plasmic/plasmic_kit_left_pane/PlasmicLeftTabStrip";
import IconIcon from "@/wab/client/plasmic/plasmic_kit_left_pane/icons/PlasmicIcon__Icon";
import DiamondsIcon from "@/wab/client/plasmic/plasmic_kit_merge_flow/icons/PlasmicIcon__Diamonds";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { PlayerData } from "@/wab/client/studio-ctx/multiplayer-ctx";
import { TutorialEventsType } from "@/wab/client/tours/tutorials/tutorials-events";
import { Stated } from "@/wab/commons/components/Stated";
import { MIXINS_CAP } from "@/wab/shared/Labels";
import { spawn, unexpected } from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { BASE_URL } from "@/wab/shared/discourse/config";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { fillRoute } from "@/wab/shared/route/route";
import {
  LeftTabKey,
  LeftTabUiKey,
  getLeftTabPermission,
} from "@/wab/shared/ui-config-utils";
import { Popover } from "antd";
import classNames from "classnames";
import { omit } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { ReactNode } from "react";
import { useIntercom } from "react-use-intercom";

interface LeftTabStripProps extends DefaultLeftTabStripProps {
  useVersionsCTA: boolean;
}

export interface NavMenuItem {
  type: "item";
  icon: ReactNode;
  label: string;
  tabKey?: LeftTabKey;
  cond?: boolean;
  href?: string;
  className?: string;
  onClick?: () => void;
  showAlert?: "showAlert" | "showYellowCircle" | undefined;
}

export interface NavMenuGroup {
  type: "group";
  icon: ReactNode;
  title: string;
  items: Record<string, NavMenuItem>;
}

const LeftTabStrip = observer(function LeftTabStrip(props: LeftTabStripProps) {
  const studioCtx = useStudioCtx();
  const { show: showIntercom } = useIntercom();
  const isLoggedIn = studioCtx.appCtx.selfInfo != null;
  const contentEditorMode = studioCtx.contentEditorMode;
  const hasGlobalContexts = studioCtx.site.globalContexts.length > 0;
  const missingUsedFonts = studioCtx.fontManager.missingUsedFonts();
  const shortcutModalButtonClassName = "shortcut-modal-button";

  const isWhiteLabelUser = studioCtx.appCtx.isWhiteLabelUser();
  const uiConfig = studioCtx.getCurrentUiConfig();

  const canViewTab = (tab: LeftTabUiKey) => {
    return (
      getLeftTabPermission(uiConfig, tab, {
        isContentCreator: contentEditorMode,
      }) !== "hidden"
    );
  };

  /*
  Outline

Copilot

Issues

Assets
  Tokens
  Mixins
  Components
  Images

Settings
  Project Settings
  Custom Fonts
  Responsive Breakpoints
  Imported Projects
  Published Versions

More
  Splits
  Figma import

Help
  Docs
  Slack community
  Keyboard shortcuts
   */
  const mainGroups: Record<string, NavMenuGroup> = {
    assets: {
      type: "group",
      icon: <ComponentssvgIcon />,
      title: "Assets",
      items: {
        tokens: {
          type: "item",
          tabKey: "tokens",
          icon: <DiamondsIcon />,
          label: "Style tokens",
          cond: canViewTab("tokens"),
        },
        mixins: {
          type: "item",
          tabKey: "mixins",
          icon: <MixinIcon />,
          label: MIXINS_CAP,
          cond: canViewTab("mixins"),
        },
        components: {
          type: "item",
          tabKey: "components",
          icon: <ComponentsvgIcon />,
          label: "Components",
          cond: canViewTab("components"),
        },
        images: {
          type: "item",
          tabKey: "images",
          icon: <PhotosvgIcon />,
          label: "Images and icons",
          cond: canViewTab("images"),
        },
      },
    },
    settingsGroup: {
      type: "group",
      icon: <GearIcon />,
      title: "Settings",
      items: {
        settings: {
          type: "item",
          tabKey: "settings",
          icon: <GearIcon />,
          label: "Project settings",
          cond: hasGlobalContexts && canViewTab("settings"),
        },
        fonts: {
          type: "item",
          tabKey: "fonts",
          icon: <FontFamily2SvgIcon />,
          label: "Custom fonts",
          cond: canViewTab("fonts"),
          showAlert: missingUsedFonts.length > 0 ? "showAlert" : undefined,
        },
        responsiveness: {
          type: "item",
          tabKey: "responsiveness",
          icon: <DevicessvgIcon />,
          label: "Responsive breakpoints",
          cond: canViewTab("responsiveness"),
        },
        themes: {
          type: "item",
          tabKey: "themes",
          icon: <Paintbrush2SvgIcon />,
          label: "Default styles theme",
          cond: canViewTab("themes"),
        },
      },
    },
    more: {
      type: "group",
      icon: <DotsHorizontalCirclesvgIcon />,
      title: "More",
      items: {
        splits: {
          type: "item",
          tabKey: "splits",
          icon: <IconIcon />,
          label: "Split content",
          cond:
            isLoggedIn &&
            DEVFLAGS.splits &&
            canViewTab("splits") &&
            !isWhiteLabelUser,
        },
        imports: {
          type: "item",
          tabKey: "imports",
          icon: <DownloadsvgIcon />,
          label: "Imported projects",
          cond: isLoggedIn && canViewTab("imports"),
        },
        versions: {
          type: "item",
          tabKey: "versions",
          icon: <ClocksvgIcon />,
          label: "Published versions",
          cond: isLoggedIn && canViewTab("versions"),
          showAlert: props.useVersionsCTA ? "showYellowCircle" : undefined,
        },
        figma: {
          type: "item",
          icon: <FigmasvgIcon />,
          label: "Import from Figma",
          cond: canViewTab("figma"),
          onClick: () => {
            spawn(
              showTemporaryInfo({
                title: "Import from Figma",
                content: <FigmaModalContent />,
                width: 640,
              })
            );
          },
        },
      },
    },
  };
  const topMenu: Record<string, NavMenuItem | NavMenuGroup> = {
    outline: {
      type: "item",
      tabKey: "outline",
      icon: <TreeIcon />,
      label: "Outline",
    },
    copilot: {
      type: "item",
      tabKey: "copilot",
      icon: <WandIcon />,
      label: "Copilot",
      cond: studioCtx.appCtx.appConfig.copilotTab && canViewTab("copilot"),
    },
    lint: {
      type: "item",
      tabKey: "lint",
      icon: <WarningTrianglesvgIcon />,
      label: "Issues detected",
      cond: DEVFLAGS.linting && canViewTab("lint"),
    },
    ...(contentEditorMode
      ? {
          more: {
            ...mainGroups.more,
            items: Object.fromEntries(
              Object.entries(mainGroups).flatMap(([_groupKey, group]) =>
                Object.entries(group.items)
              )
            ),
          },
        }
      : mainGroups),
  };
  const bottomMenu: Record<string, NavMenuItem | NavMenuGroup> = {
    intercom: {
      type: "item",
      icon: <ChatDocssvgIcon />,
      label: "Chat Docs",
      cond: isIntercomEnabled(studioCtx),
      onClick: showIntercom,
    },
    helpGroup: {
      type: "group",
      icon: <HelpCirclesvgIcon />,
      title: "Help",
      items: {
        keyboard: {
          type: "item",
          icon: <KeyboardIcon />,
          label: "Keyboard shortcuts",
          className: shortcutModalButtonClassName,
          onClick: studioCtx.openShortcutsModal,
        },
        slack: {
          type: "item",
          icon: <SlackIcon style={{ margin: 4 }} height={16} width={16} />,
          label: "Slack community",
          href: "https://www.plasmic.app/slack",
          cond: !isWhiteLabelUser,
        },
        forum: {
          type: "item",
          icon: <MessagesvgIcon />,
          label: "Forum",
          href: BASE_URL,
          cond: !isWhiteLabelUser,
        },
        docs: {
          type: "item",
          icon: <BooksvgIcon />,
          label: "Documentation",
          href: "https://docs.plasmic.app/",
          cond: !isWhiteLabelUser,
        },
        help: {
          type: "item",
          icon: <HelpsvgIcon />,
          label: "Help",
          href: fillRoute(APP_ROUTES.orgSupport, {
            teamId: studioCtx.siteInfo.teamId!,
          }),
          cond: !isWhiteLabelUser,
        },
      },
    },
  };

  function renderButton(
    key: string,
    item: NavMenuItem,
    hasLabel: boolean,
    onClick: (() => void) | undefined
  ) {
    return (
      (item.cond ?? true) && (
        <LeftTabButton
          key={key}
          icon={item.icon}
          label={item.label}
          hasLabel={hasLabel}
          tooltip={!hasLabel && item.label}
          onClick={() =>
            studioCtx.changeUnsafe(() => {
              item.onClick?.();
              if (item.tabKey) {
                if (studioCtx.leftTabKey === item.tabKey) {
                  studioCtx.switchLeftTab(undefined);
                } else {
                  studioCtx.switchLeftTab(item.tabKey);
                }
              }
              (() => {
                onClick?.();
              })?.();
            })
          }
          data-test-tabkey={key}
          showAlert={item.showAlert}
          href={item.href}
          className={item.className}
          isSelected={item.tabKey && item.tabKey === studioCtx.leftTabKey}
        />
      )
    );
  }

  const renderButtonGroup = (buttons: typeof topMenu) => {
    return Object.entries(buttons).map(([key, item]) =>
      item.type === "item"
        ? renderButton(key, item, false, undefined)
        : item.type === "group"
        ? Object.values(item.items).some((i) => i.cond ?? true) && (
            <Stated defaultValue={false} key={key}>
              {(open, setOpen) => (
                <Popover
                  placement={"right"}
                  overlayClassName={"sidebar-popover"}
                  open={open}
                  onOpenChange={(o) => setOpen(o)}
                  content={
                    <>
                      <div
                        style={{
                          margin: 6,
                          marginLeft: 10,
                          color: "#999",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          fontSize: 11,
                        }}
                      >
                        {item.title}
                      </div>
                      {Object.entries(item.items).map(([subkey, subitem]) =>
                        renderButton(subkey, subitem, true, () =>
                          setOpen(false)
                        )
                      )}
                    </>
                  }
                >
                  <LeftTabButton
                    icon={item.icon}
                    data-test-tabkey={key}
                    onClick={() =>
                      studioCtx.changeUnsafe(() => {
                        studioCtx.switchLeftTab(undefined);
                      })
                    }
                    isSelected={Object.keys(item.items).some(
                      (i) => i === studioCtx.leftTabKey
                    )}
                  />
                </Popover>
              )}
            </Stated>
          )
        : unexpected()
    );
  };

  return (
    <PlasmicLeftTabStrip
      showAvatar
      activeTab={studioCtx.leftTabKey}
      insert={{
        props: {
          onClick: () => {
            studioCtx.tourActionEvents.dispatch({
              type: TutorialEventsType.AddButtonClicked,
            });
            spawn(
              studioCtx.changeUnsafe(() => studioCtx.setShowAddDrawer(true))
            );
          },
        },
      }}
      root={{ className: props.className, id: "left-tab-strip" }}
      buttons={renderButtonGroup(topMenu)}
      bottomButtons={renderButtonGroup(bottomMenu)}
      players={{
        render: (_props) => {
          // Exclude 'children' from props to avoid React warnings about missing keys,
          // as they are already omitted inside Player and not needed here.
          const { children: _children, ...otherProps } = _props;
          return <Players {...otherProps} studioCtx={studioCtx} />;
        },
      }}
      avatar={{
        render: () =>
          studioCtx.appCtx.selfInfo ? (
            <Avatar user={studioCtx.appCtx.selfInfo} tooltipPlacement="right" />
          ) : (
            <AnonymousAvatar tooltipPlacement="right" />
          ),
      }}
    />
  );
});

export default LeftTabStrip;

interface PlayersProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLDivElement>,
    HTMLDivElement
  > {
  studioCtx: StudioCtx;
}

const Players = observer((playersProps: PlayersProps) => {
  const otherProps = omit(playersProps, ["children", "studioCtx"]);
  const { studioCtx } = playersProps;
  const allPlayers = studioCtx.multiplayerCtx.getAllPlayerData();
  // Limit to 10 players on the left
  const players = allPlayers.length > 10 ? allPlayers.slice(0, 9) : allPlayers;
  const extraPlayers = allPlayers.length > 10 ? allPlayers.slice(9) : [];
  const playerAvatar = ([playerId, playerData]: [number, PlayerData]) => {
    // TODO: https://app.shortcut.com/plasmic/story/37322
    const canBeFollowed = !playerData.viewInfo?.arenaInfo?.focused;
    const styleOverrides = {
      className: "AvatarPlayer",
      style: {
        borderColor: canBeFollowed ? playerData.color : undefined,
      } as React.CSSProperties,
      tooltipPlacement: "right" as const,
    };
    const onClick = canBeFollowed
      ? () => studioCtx.setWatchPlayerId(playerId)
      : undefined;
    return playerData.type === "AnonUser" ? (
      <AnonymousAvatar {...styleOverrides} key={playerId} onClick={onClick} />
    ) : (
      <Avatar
        user={playerData.user}
        {...styleOverrides}
        key={playerId}
        onClick={onClick}
      />
    );
  };
  return (
    <div {...otherProps}>
      {players.map(playerAvatar)}
      {extraPlayers.length > 0 && (
        <Popover
          placement="right"
          content={
            <div style={{ display: "flex", flexDirection: "column" }}>
              {extraPlayers.map(playerAvatar)}
            </div>
          }
        >
          <div className={classNames("Avatar", "AvatarPlayerSize")}>
            +{extraPlayers.length}
          </div>
        </Popover>
      )}
    </div>
  );
});
