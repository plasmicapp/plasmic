/** @format */

import { menuSection } from "@/wab/client/components/menu-builder";
import { useAppCtx, useTopFrameApi } from "@/wab/client/contexts/AppContexts";
import CirclesvgIcon from "@/wab/client/plasmic/plasmic_kit_q_4_icons/icons/PlasmicIcon__Circlesvg";
import {
  DefaultPublishButtonProps,
  PlasmicPublishButton,
} from "@/wab/client/plasmic/plasmic_kit_top_bar/PlasmicPublishButton";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { TutorialEventsType } from "@/wab/client/tours/tutorials/tutorials-events";
import { MainBranchId } from "@/wab/shared/ApiSchema";
import { spawn, spawnWrapper } from "@/wab/shared/common";
import { PlasmicIcon } from "@plasmicapp/react-web";
import { Menu, Tooltip } from "antd";
import L from "lodash";
import { observer } from "mobx-react";
import * as React from "react";

interface PublishButtonProps extends DefaultPublishButtonProps {
  enable?: boolean;
}

export const PublishButton = observer(function PublishButton(
  props: PublishButtonProps
) {
  const studioCtx = useStudioCtx();
  const appCtx = useAppCtx();
  const topFrameApi = useTopFrameApi();

  // revision number of latest published version
  const [latestPublishedRevNum, setLatestPublishedRevNum] =
    React.useState<number>();

  const latestPublishedVersion = L.head(studioCtx.releases);

  React.useEffect(() => {
    spawn(
      (async () => {
        const { rev: latestPublishedRev } = latestPublishedVersion
          ? await appCtx.api.getProjectRevWithoutData(
              studioCtx.siteInfo.id,
              latestPublishedVersion.revisionId,
              latestPublishedVersion.branchId ?? undefined
            )
          : { rev: null };
        setLatestPublishedRevNum(latestPublishedRev?.revision);
      })()
    );
  }, [appCtx, latestPublishedVersion]);

  const redCircle =
    studioCtx.releases.length > 0 &&
    !!latestPublishedRevNum &&
    latestPublishedRevNum < studioCtx.dbCtx().revisionNum;

  if (!props.enable) {
    return null;
  }

  const isPlasmicLevels =
    studioCtx.siteInfo.name.includes("Plasmic Levels") &&
    !studioCtx.siteInfo.name.endsWith("Primary Copy");

  const branchInfo = studioCtx.dbCtx().branchInfo;

  return (
    <>
      <PlasmicPublishButton
        menuButton={
          !branchInfo
            ? {}
            : {
                style: {
                  display: "flex",
                },
                onClick: () => {
                  return topFrameApi.setMergeModalContext({
                    subject: {
                      toBranchId: MainBranchId,
                      fromBranchId: branchInfo.id,
                    },
                  });
                },
                menu: () => (
                  <Menu>
                    {menuSection(
                      "branch",
                      <Menu.Item
                        key="merge"
                        onClick={async () => {
                          await topFrameApi.setMergeModalContext({
                            subject: {
                              toBranchId: MainBranchId,
                              fromBranchId: branchInfo.id,
                            },
                          });
                        }}
                      >
                        <strong>Review and merge changes</strong> from this
                        branch
                      </Menu.Item>,
                      <Menu.Item
                        key="pull"
                        onClick={async () => {
                          await topFrameApi.setMergeModalContext({
                            subject: {
                              toBranchId: branchInfo.id,
                              fromBranchId: MainBranchId,
                            },
                          });
                        }}
                      >
                        <strong>Update</strong> from main branch
                      </Menu.Item>,
                      appCtx.appConfig.commitsOnBranches && (
                        <Menu.Item
                          key="commit"
                          onClick={async () => {
                            await topFrameApi.setShowPublishModal(true);
                          }}
                        >
                          <strong>Save</strong> a checkpoint
                        </Menu.Item>
                      )
                    )}
                  </Menu>
                ),
                tooltip: (
                  <>
                    Publish a new version of your project
                    {redCircle && (
                      <div className="mt-sm">
                        (This project has unpublished changes.)
                      </div>
                    )}
                  </>
                ),
              }
        }
        button={
          branchInfo
            ? {
                style: { display: "none" },
              }
            : {
                wrap: !isPlasmicLevels
                  ? undefined
                  : (node) => (
                      <Tooltip title={"Disabled for Plasmic Levels"}>
                        {node}
                        <div className={"cover"}></div>
                      </Tooltip>
                    ),
                props: {
                  id: "topbar-publish-btn",
                  onClick: spawnWrapper(() => {
                    studioCtx.tourActionEvents.dispatch({
                      type: TutorialEventsType.PublishButtonClicked,
                    });
                    return topFrameApi.setShowPublishModal(true);
                  }),
                  disabled: isPlasmicLevels,
                  tooltip: (
                    <>
                      Publish a new version of your project
                      {redCircle && (
                        <div className="mt-sm">
                          (This project has unpublished changes.)
                        </div>
                      )}
                    </>
                  ),
                },
              }
        }
      />
      {redCircle && (
        <PlasmicIcon
          PlasmicIconType={CirclesvgIcon}
          className={
            redCircle ? "red-circle-top-right" : "yellow-circle-top-right"
          }
          role={"img"}
        />
      )}
    </>
  );
});

export default PublishButton;
