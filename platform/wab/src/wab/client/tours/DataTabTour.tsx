import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { observer } from "mobx-react";
import React from "react";
import { Tour } from "./Tour";

export const DataTabTour = observer(function DataTabTour() {
  const studioCtx = useStudioCtx();
  const seenStateKey = "plasmic.tours.data-tab";
  const targetSelector = "#nav-tab-components";
  const onlyUsersCreatedBefore =
    studioCtx.appCtx.appConfig.dataTabTourForUsersBefore;
  const content = (
    <>
      <h4 className="text-xlg mb-p">Page/component settings have moved!</h4>
      <p>
        Go to the Data tab to edit variants, or click the gear icon on your page
        to edit page SEO settings.
      </p>
    </>
  );
  return (
    <Tour
      {...{
        seenStateKey: seenStateKey,
        onlyUsersCreatedBefore: onlyUsersCreatedBefore,
        targetSelector: targetSelector,
        content: content,
      }}
    />
  );
});
