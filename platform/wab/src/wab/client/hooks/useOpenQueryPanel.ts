import { useDataSourceOpExprPanels } from "@/wab/client/components/sidebar-tabs/DataSource/DataSourceOpPicker";
import { useServerQueryPanels } from "@/wab/client/components/sidebar-tabs/ServerQuery/ServerQueryPanel";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { ExprCtx } from "@/wab/shared/core/exprs";
import {
  ComponentDataQuery,
  ComponentServerQuery,
  isKnownComponentDataQuery,
} from "@/wab/shared/model/classes";
import {
  renameQueryAndFixExprs,
  renameServerQueryAndFixExprs,
} from "@/wab/shared/refactoring";

/** Opens the bottom panel editor for a query of `viewCtx.currentComponent()`. */
export function useOpenQueryPanel() {
  const dataQueryPanels = useDataSourceOpExprPanels();
  const serverQueryPanels = useServerQueryPanels();
  return (
    viewCtx: ViewCtx,
    query: ComponentDataQuery | ComponentServerQuery,
  ) => {
    const studioCtx = viewCtx.studioCtx;
    const component = viewCtx.currentComponent();
    const tpl = viewCtx.currentCtxTplRoot();
    const exprCtx: ExprCtx = {
      projectFlags: studioCtx.projectFlags(),
      component,
      inStudio: true,
    };
    if (isKnownComponentDataQuery(query)) {
      const close = () => dataQueryPanels.close(query.uuid);
      dataQueryPanels.open(query.uuid, {
        title: () => query.name,
        parent: query,
        value: query.op ?? undefined,
        onSave: (newOp, opExprName) => {
          query.op = newOp;
          if (opExprName && opExprName !== query.name) {
            renameQueryAndFixExprs(component, query, opExprName);
          }
        },
        onCancel: close,
        tpl,
        viewCtx,
        readOpsOnly: true,
        exprCtx,
      });
    } else {
      const close = () => serverQueryPanels.close(query.uuid);
      serverQueryPanels.open(query.uuid, {
        value: query,
        onSave: (newOp, opExprName) => {
          query.op = newOp;
          if (opExprName && opExprName !== query.name) {
            renameServerQueryAndFixExprs(component, query, opExprName);
          }
        },
        onCancel: close,
        // The panel derives env from viewCtx and tpl itself, so it stays live.
        viewCtx,
        tpl,
        exprCtx,
      });
    }
  };
}
