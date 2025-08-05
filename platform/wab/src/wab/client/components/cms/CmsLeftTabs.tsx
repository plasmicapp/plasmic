import { useCmsDatabase } from "@/wab/client/components/cms/cms-contexts";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import {
  DefaultCmsLeftTabsProps,
  PlasmicCmsLeftTabs,
} from "@/wab/client/plasmic/plasmic_kit_cms/PlasmicCmsLeftTabs";
import { ensure } from "@/wab/shared/common";
import { accessLevelRank } from "@/wab/shared/EntUtil";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { fillRoute } from "@/wab/shared/route/route";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";
import { useRouteMatch } from "react-router";

export type CmsLeftTabsProps = DefaultCmsLeftTabsProps;

function CmsLeftTabs_(props: CmsLeftTabsProps, ref: HTMLElementRefOf<"div">) {
  const match = useRouteMatch<any>()!;
  const params: any = {
    databaseId: match.params.databaseId,
  };
  const appCtx = useAppCtx();
  const database = useCmsDatabase(match.params.databaseId);

  if (!database) {
    return null;
  }

  const team = ensure(
    appCtx.workspaces.find((w) => w.id === database.workspaceId),
    "Expected existing workspace"
  ).team;

  const shouldHideSettingsButton =
    accessLevelRank(
      appCtx.perms.find(
        (p) =>
          (p.workspaceId === database.workspaceId || p.teamId === team.id) &&
          p.userId === ensure(appCtx.selfInfo, "Unexpected nullish selfInfo").id
      )?.accessLevel || "blocked"
    ) < accessLevelRank("editor");
  return (
    <PlasmicCmsLeftTabs
      root={{ ref }}
      {...props}
      contentButton={{
        href: match.params.tableId
          ? fillRoute(APP_ROUTES.cmsModelContent, {
              ...params,
              tableId: match.params.tableId,
            })
          : fillRoute(APP_ROUTES.cmsContentRoot, params),
        tooltip: "Edit content",
        "data-test-id": "cmsContent",
      }}
      schemaButton={{
        href: match.params.tableId
          ? fillRoute(APP_ROUTES.cmsModelSchema, {
              ...params,
              tableId: match.params.tableId,
            })
          : fillRoute(APP_ROUTES.cmsSchemaRoot, params),
        tooltip: "Edit models",
        "data-test-id": "cmsModels",
      }}
      settingsButton={{
        style: shouldHideSettingsButton ? { display: "none" } : {},
        href: fillRoute(APP_ROUTES.cmsSettings, params),
        tooltip: "CMS Settings",
        "data-test-id": "cmsSettings",
      }}
    />
  );
}

const CmsLeftTabs = React.forwardRef(CmsLeftTabs_);
export default CmsLeftTabs;
