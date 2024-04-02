import { useViewCtx } from "@/wab/client/contexts/StudioContexts";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { observer } from "mobx-react";
import React from "react";
import { StyleTab, StyleTabContext } from "./style-tab";

export const SettingsTab = observer((props: {}) => {
  const studioCtx = useStudioCtx();
  const vc = useViewCtx();
  return (
    <StyleTabContext.Provider value={"settings-only"}>
      <StyleTab studioCtx={studioCtx} viewCtx={vc} />
    </StyleTabContext.Provider>
  );
});
