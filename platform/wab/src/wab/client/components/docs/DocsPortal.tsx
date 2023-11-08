import { observer } from "mobx-react-lite";
import * as React from "react";
import { useState } from "react";
import { Route, Switch } from "react-router";
import { useHistory } from "react-router-dom";
import DocsPortalBranches from "../../../../DocsPortalBranches";
import { UU } from "../../cli-routes";
import { fixStudioIframePositionAndOverflow } from "../../dom-utils";
import { HostFrameCtx } from "../../frame-ctx/host-frame-ctx";
import { PlasmicDocsPortal } from "../../plasmic/plasmic_kit_docs_portal/PlasmicDocsPortal";
import CodegenTypeContext from "../../plasmic/plasmic_kit_docs_portal/PlasmicGlobalVariant__CodegenType";
import { StudioCtx } from "../../studio-ctx/StudioCtx";
import { TopFrameObserver } from "../studio/TopFrameObserver";
import { DocsPortalCtx, providesDocsPortalCtx } from "./DocsPortalCtx";

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
        </Route>
      </Switch>
    </CodegenTypeContext.Provider>
  );
});

export default DocsPortal;
