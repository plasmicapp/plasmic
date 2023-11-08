import { observer } from "mobx-react-lite";
import React from "react";
import { useViewCtx } from "../../contexts/StudioContexts";
import { useStudioCtx } from "../../studio-ctx/StudioCtx";
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
