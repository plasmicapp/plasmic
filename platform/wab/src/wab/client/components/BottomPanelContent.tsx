import { useBottomPanelActions } from "@/wab/client/components/BottomPanel";
import type { BottomPanelTabConfig } from "@/wab/client/components/BottomPanelState";
import {
  BindingPanelContent,
  DataBrowseContent,
} from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerPanel";
import { FormDataConnectionPanel } from "@/wab/client/components/sidebar-tabs/DataSource/ConnectToDBTable";
import { DataSourceOpExprPanelContent } from "@/wab/client/components/sidebar-tabs/DataSource/DataSourceOpPicker";
import { ServerQueryPanelContent } from "@/wab/client/components/sidebar-tabs/ServerQuery/ServerQueryPanel";
import { assertNever } from "@/wab/shared/common";
import { observer } from "mobx-react";
import React from "react";

/** Resolve a tab at render time; its opener does not own the editor's lifetime. */
export const BottomPanelContent = observer(function BottomPanelContent({
  config,
}: {
  config: BottomPanelTabConfig;
}) {
  const panel = useBottomPanelActions();
  const content = config.content;
  if (!content) {
    return null;
  }
  const saveAndClose = () => panel.saveAndClose(config.id);
  const cancel = (onCancel: () => void | Promise<void>) => {
    if (panel.discard(config.id)) {
      void onCancel();
    }
  };
  switch (content.kind) {
    case "dataBrowser":
      return <DataBrowseContent />;
    case "binding":
      return <BindingPanelContent config={config} content={content} />;
    case "dataQuery":
      return (
        <DataSourceOpExprPanelContent
          {...content.props}
          session={content.session}
          saveAndClose={saveAndClose}
          onCancel={() => cancel(content.props.onCancel)}
        />
      );
    case "serverQuery":
      return (
        <ServerQueryPanelContent
          {...content.props}
          cloneKey={content.cloneKey}
          session={content.session}
          saveAndClose={saveAndClose}
          onCancel={() => cancel(content.props.onCancel)}
        />
      );
    case "formConnection":
      return (
        <FormDataConnectionPanel {...content.props} session={content.session} />
      );
    default:
      return assertNever(content);
  }
});
