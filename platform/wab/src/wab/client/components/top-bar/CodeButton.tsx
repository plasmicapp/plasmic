import { U } from "@/wab/client/cli-routes";
import { useAppCtx, useTopFrameApi } from "@/wab/client/contexts/AppContexts";
import { useCodegenType } from "@/wab/client/hooks/useCodegenType";
import CirclesvgIcon from "@/wab/client/plasmic/plasmic_kit_q_4_icons/icons/PlasmicIcon__Circlesvg";
import PlasmicCodeButton from "@/wab/client/plasmic/plasmic_kit_top_bar/PlasmicCodeButton";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { spawn } from "@/wab/common";
import { isPlasmicComponent } from "@/wab/components";
import { toClassName } from "@/wab/shared/codegen/util";
import { PlasmicIcon } from "@plasmicapp/react-web";
import { Menu, Tooltip } from "antd";
import { defer } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { MdOpenInNew } from "react-icons/all";
import { useLocalStorage } from "react-use";

export const CodeButton = observer(function CodeButton() {
  const studioCtx = useStudioCtx();
  const appCtx = useAppCtx();
  const topFrameApi = useTopFrameApi();

  const artboardComponent = studioCtx.focusedViewCtx()?.component;
  const isFocusedComponentPlasmicComponent = !!(
    artboardComponent && isPlasmicComponent(artboardComponent)
  );
  const focusedComponentNameOrUuid = isFocusedComponentPlasmicComponent
    ? toClassName(artboardComponent!.name) || artboardComponent!.uuid
    : undefined;

  const anchorRef = React.useRef<HTMLDivElement>(null);

  const [hasClicked, setHasClicked] = useLocalStorage(
    "CodeButton--hasClicked",
    false
  );

  const codegenType = useCodegenType();
  const toUrl =
    hasClicked &&
    isFocusedComponentPlasmicComponent &&
    focusedComponentNameOrUuid
      ? U.projectDocsComponent({
          projectId: studioCtx.siteInfo.id,
          componentIdOrClassName: focusedComponentNameOrUuid,
          codegenType,
        })
      : U.projectDocs({
          projectId: studioCtx.siteInfo.id,
        });

  // Quick and dirty way of disabling the red dot on Plasmic Levels.
  const isPlasmicLevels = studioCtx.siteInfo.name.includes("Plasmic Levels");
  const enableCircles =
    !isPlasmicLevels && !appCtx.appConfig.hideSyncStatusIndicator;
  const projectWasNeverSyncedOrImported =
    studioCtx.siteInfo.latestRevisionSynced === 0;
  const redCircle = enableCircles && projectWasNeverSyncedOrImported;

  function showQuickstarts() {
    if (!isPlasmicLevels) {
      spawn(topFrameApi.setShowCodeModal(true));
      defer(() => setHasClicked(true));
    }
  }

  const quickstartTooltipContent = isPlasmicLevels ? (
    "Disabled for Plasmic Levels"
  ) : (
    <>
      Integrate into your codebase
      {redCircle && (
        <div className="mt-sm">
          (This project has never been synced and never been imported.)
        </div>
      )}
    </>
  );
  const props = {
    // Defer setting hasClicked, so that the url doesn't change until after
    // we've opened the link
    onClick: () => {
      showQuickstarts();
    },
    disabled: isPlasmicLevels,
    tooltip: quickstartTooltipContent,
  };

  return (
    <>
      <PlasmicCodeButton
        button={{ ...props }}
        menuButton={{
          ...props,
          menu: () => (
            <Menu>
              <Menu.Item
                onClick={() => showQuickstarts()}
                disabled={isPlasmicLevels}
              >
                <Tooltip title={quickstartTooltipContent}>Quickstarts</Tooltip>
              </Menu.Item>
              <Menu.Item
                onClick={() => window.open("https://docs.plasmic.app/learn")}
              >
                Documentation
                <MdOpenInNew style={{ color: "silver", marginLeft: "8px" }} />
              </Menu.Item>
              <Menu.Item
                disabled={isPlasmicLevels}
                onClick={() => {
                  window.open(toUrl);
                }}
              >
                <Tooltip
                  title={
                    isPlasmicLevels
                      ? "Disabled for Plasmic Levels"
                      : "Auto-generated docs and component explorer for this project"
                  }
                >
                  Component API explorer
                  <MdOpenInNew style={{ color: "silver", marginLeft: "8px" }} />
                </Tooltip>
              </Menu.Item>
              <Menu.Item
                onClick={() =>
                  window.open("https://www.github.com/plasmicapp/plasmic")
                }
              >
                Plasmic on GitHub
                <MdOpenInNew style={{ color: "silver", marginLeft: "8px" }} />
              </Menu.Item>
            </Menu>
          ),
        }}
        root={{
          ref: anchorRef,
        }}
      />
      {redCircle ? (
        <PlasmicIcon
          PlasmicIconType={CirclesvgIcon}
          className={"red-circle-top-right"}
          role={"img"}
        />
      ) : null}
    </>
  );
});

export default CodeButton;
