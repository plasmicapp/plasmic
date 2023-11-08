import { notification } from "antd";
import * as React from "react";
import { mkShortId, spawn } from "../../../common";
import { maybeConvertToHostLessProject } from "../../code-components/code-components";
import { fixStudioIframePositionAndOverflow } from "../../dom-utils";
import RocketsvgIcon from "../../plasmic/q_4_icons/icons/PlasmicIcon__Rocketsvg";
import { bindStudioShortcutHandlers } from "../../shortcuts/studio/studio-shortcut-handlers";
import { StudioCtx } from "../../studio-ctx/StudioCtx";
import { TopProjectNavTour } from "../../tours/TopProjectNavTour";
import { StudioTutorialTours } from "../../tours/tutorials/TutorialTours";
import { BottomModalsProvider } from "../BottomModal";
import { CommentsProvider } from "../comments/CommentsProvider";
import { showPlasmicImgModal } from "../modals/PlasmicImgModal";
import { ShortcutsModal } from "./Shortcuts";
import {
  getCanvasPkgs,
  getLiveFrameClientJs,
  getReactWebBundle,
} from "./studio-bundles";

interface StudioProps {
  studioCtx: StudioCtx;
  children?: React.ReactNode;
}

export class Studio extends React.Component<StudioProps, {}> {
  private unbindShortcutHandlers: () => void;

  // Hide overflow to prevent popups from temporarily causing scrollbars to
  // appear, throwing off all dynamic positioning logic (including hoverboxes
  // and popup positioning).
  componentDidMount() {
    const studioCtx = this.props.studioCtx;
    studioCtx.studioIsVisible = true;
    const appConfig = studioCtx.appCtx.appConfig;
    fixStudioIframePositionAndOverflow();

    document.body.dataset.eventProjectName = this.props.studioCtx.siteInfo.name;
    document.body.dataset.eventProjectId = this.props.studioCtx.siteInfo.id;

    // Load all chunks we'll need in advance:
    spawn(getCanvasPkgs());
    spawn(getReactWebBundle());
    spawn(getLiveFrameClientJs());
    spawn(maybeConvertToHostLessProject(studioCtx));
    if (
      !appConfig.usePlasmicImg &&
      appConfig.showPlasmicImgModal &&
      studioCtx.canEditProject()
    ) {
      const id = mkShortId();
      notification.info({
        key: id,
        message: "Enable image optimization for this project?",
        description: (
          <p>
            <a
              onClick={() => {
                notification.close(id);
                return showPlasmicImgModal(studioCtx);
              }}
            >
              Click here
            </a>{" "}
            to read more about the new image optimization feature and enable it
            for this project
          </p>
        ),
        duration: 20,
        icon: <RocketsvgIcon />,
      });
    }

    this.unbindShortcutHandlers = bindStudioShortcutHandlers(studioCtx);
  }
  componentWillUnmount() {
    this.unbindShortcutHandlers();
    this.props.studioCtx.studioIsVisible = false;
    document.body.style.overflow = "";
  }
  dbCtx() {
    return this.props.studioCtx.dbCtx();
  }
  render() {
    return (
      <ShortcutsModal>
        <CommentsProvider>
          <BottomModalsProvider>
            <div className={"studio"}>
              <div className={"studio__main-area"}>{this.props.children}</div>
            </div>
            <React.Suspense fallback={null}>
              <TopProjectNavTour />
              <StudioTutorialTours />
            </React.Suspense>
          </BottomModalsProvider>
        </CommentsProvider>
      </ShortcutsModal>
    );
  }
}
