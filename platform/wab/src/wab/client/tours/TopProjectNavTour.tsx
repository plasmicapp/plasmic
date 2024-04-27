import { KeyboardShortcut } from "@/wab/client/components/menu-builder";
import { getComboForAction } from "@/wab/client/shortcuts/studio/studio-shortcuts";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { Tour } from "@/wab/client/tours/Tour";
import { observer } from "mobx-react";
import React from "react";

export const TopProjectNavTour = observer(function TopProjectNavTour() {
  const studioCtx = useStudioCtx();
  const seenStateKey = "plasmic.tours.top-project-nav";
  const targetSelector = "#proj-nav-button";
  const onlyUsersCreatedBefore = "2022-11-01";
  const didActionSignal = studioCtx.showProjectPanelRequested;
  const content = (
    <>
      <h4 className="text-xlg mb-p">Project navigation has moved!</h4>
      <p>
        Use this dropdown to navigate to your pages and components. You can also
        use the keyboard shortcut{" "}
        <KeyboardShortcut>
          {getComboForAction("SEARCH_PROJECT_ARENAS")}
        </KeyboardShortcut>{" "}
        to open the dropdown.
      </p>
    </>
  );
  return (
    <Tour
      {...{
        seenStateKey: seenStateKey,
        onlyUsersCreatedBefore: onlyUsersCreatedBefore,
        didActionSignal: didActionSignal,
        targetSelector: targetSelector,
        content: content,
      }}
    />
  );
});
