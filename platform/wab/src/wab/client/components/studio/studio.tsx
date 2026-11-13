import { maybeConvertToHostLessProject } from "@/wab/client/code-components/code-components";
import { DataPickerPanelProvider } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerPanel";
import { ShortcutsModal } from "@/wab/client/components/studio/Shortcuts";
import {
  getCanvasPkgs,
  getLiveFrameClientJs,
  getReactWebBundle,
} from "@/wab/client/components/studio/studio-bundles";
import { fixStudioIframePositionAndOverflow } from "@/wab/client/dom-utils";
import { analytics } from "@/wab/client/observability";
import { bindStudioShortcutHandlers } from "@/wab/client/shortcuts/studio/studio-shortcut-handlers";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { TopProjectNavTour } from "@/wab/client/tours/TopProjectNavTour";
import { StudioTutorialTours } from "@/wab/client/tours/tutorials/TutorialTours";
import { spawn } from "@/wab/shared/common";
import { PlasmicQueryDataProvider } from "@plasmicapp/query";
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
        <PlasmicQueryDataProvider
          provider={() => this.props.studioCtx.hostQuerySwrCache}
        >
          <DataPickerPanelProvider>
            <div className={"studio"}>
              <div className={"studio__main-area"}>{this.props.children}</div>
            </div>
            <React.Suspense fallback={null}>
              <TopProjectNavTour />
              <StudioTutorialTours />
            </React.Suspense>
          </DataPickerPanelProvider>
        </PlasmicQueryDataProvider>
      </ShortcutsModal>
    );
  }
}
