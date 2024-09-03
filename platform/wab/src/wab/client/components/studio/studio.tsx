import { analytics } from "@/wab/client/analytics";
import { maybeConvertToHostLessProject } from "@/wab/client/code-components/code-components";
import { BottomModalsProvider } from "@/wab/client/components/BottomModal";
import { CommentsProvider } from "@/wab/client/components/comments/CommentsProvider";
import { showPlasmicImgModal } from "@/wab/client/components/modals/PlasmicImgModal";
import { ShortcutsModal } from "@/wab/client/components/studio/Shortcuts";
import {
  getCanvasPkgs,
  getLiveFrameClientJs,
  getReactWebBundle,
} from "@/wab/client/components/studio/studio-bundles";
import { fixStudioIframePositionAndOverflow } from "@/wab/client/dom-utils";
import RocketsvgIcon from "@/wab/client/plasmic/q_4_icons/icons/PlasmicIcon__Rocketsvg";
import { bindStudioShortcutHandlers } from "@/wab/client/shortcuts/studio/studio-shortcut-handlers";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { TopProjectNavTour } from "@/wab/client/tours/TopProjectNavTour";
import { StudioTutorialTours } from "@/wab/client/tours/tutorials/TutorialTours";
import { mkShortId, spawn } from "@/wab/shared/common";
import { notification } from "antd";
import * as React from "react";

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

    analytics().appendBaseEventProperties({
      ProjectId: this.props.studioCtx.siteInfo.id,
      ProjectName: this.props.studioCtx.siteInfo.name,
    });

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
