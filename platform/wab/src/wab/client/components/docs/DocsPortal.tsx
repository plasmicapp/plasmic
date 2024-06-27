import DocsPortalBranches from "@/wab/client/components/docs/DocsPortalBranches";
import { UU } from "@/wab/client/cli-routes";
import { BottomModalsProvider } from "@/wab/client/components/BottomModal";
import {
  DocsPortalCtx,
  providesDocsPortalCtx,
} from "@/wab/client/components/docs/DocsPortalCtx";
import { TopFrameObserver } from "@/wab/client/components/studio/TopFrameObserver";
import { fixStudioIframePositionAndOverflow } from "@/wab/client/dom-utils";
import { HostFrameCtx } from "@/wab/client/frame-ctx/host-frame-ctx";
import { PlasmicDocsPortal } from "@/wab/client/plasmic/plasmic_kit_docs_portal/PlasmicDocsPortal";
import CodegenTypeContext from "@/wab/client/plasmic/plasmic_kit_docs_portal/PlasmicGlobalVariant__CodegenType";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { observer } from "mobx-react";
import * as React from "react";
import { useState } from "react";
import { Route, Switch } from "react-router";
import { useHistory } from "react-router-dom";

interface DocsPortalProps {
  hostFrameCtx: HostFrameCtx;
  studioCtx: StudioCtx;
}

const DocsPortal = observer(function DocsPortal(props: DocsPortalProps) {
  const { studioCtx } = props;
  const history = useHistory();
  const [docsCtx] = useState(() => new DocsPortalCtx(studioCtx));

  React.useEffect(() => {
    studioCtx.isDocs = true;
    fixStudioIframePositionAndOverflow();
    return () => {
      studioCtx.isDocs = false;
    };
  }, [studioCtx]);

  React.useEffect(() => {
    // First subscribes to update docsCtx on any redirect
    const disposeHistoryListener = history.listen((location) => {
      docsCtx.updateStateFromRoute(history, location.pathname);
    });

    // Then, either initializes docsCtx state or redirects
    docsCtx.updateStateFromRoute(history, history.location.pathname);

    return () => {
      disposeHistoryListener();
    };
  }, [docsCtx]);

  const codegenType = docsCtx.getCodegenType();

  return providesDocsPortalCtx(docsCtx)(
    <CodegenTypeContext.Provider
      value={codegenType === "loader" ? "loader2" : codegenType}
    >
      <TopFrameObserver />
      <Switch>
        <Route path={UU.projectDocs.pattern} exact>
          <DocsPortalBranches />
        </Route>
        <Route>
          <BottomModalsProvider>
            <PlasmicDocsPortal
              activeTab={docsCtx.docsTabKey}
              docsPortalHeader={{ projectName: studioCtx.siteInfo.name }}
              root={{
                style: {
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                },
              }}
            />
          </BottomModalsProvider>
        </Route>
      </Switch>
    </CodegenTypeContext.Provider>
  );
});

export default DocsPortal;
