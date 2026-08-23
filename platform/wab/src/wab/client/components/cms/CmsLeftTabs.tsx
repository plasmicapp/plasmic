import { useCmsDatabase } from "@/wab/client/components/cms/cms-contexts";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import {
  DefaultCmsLeftTabsProps,
  PlasmicCmsLeftTabs,
} from "@/wab/client/plasmic/plasmic_kit_cms/PlasmicCmsLeftTabs";
import { useMatchedRoute } from "@/wab/client/route/useMatchedRoute";
import { CmsDatabaseId, CmsTableId } from "@/wab/shared/ApiSchema";
import { accessLevelRank } from "@/wab/shared/EntUtil";
import { ensure } from "@/wab/shared/common";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

export type CmsLeftTabsProps = DefaultCmsLeftTabsProps;

function CmsLeftTabs_(props: CmsLeftTabsProps, ref: HTMLElementRefOf<"div">) {
  const appCtx = useAppCtx();
  const match = useMatchedRoute<{
    databaseId: CmsDatabaseId;
    tableId: CmsTableId;
  }>()!;
  const params = { databaseId: match.pathParams.databaseId };
  const database = useCmsDatabase(match.pathParams.databaseId);

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
        href: match.pathParams.tableId
          ? APP_ROUTES.cmsModelContent.fill({
              ...params,
              tableId: match.pathParams.tableId,
            })
          : APP_ROUTES.cmsContentRoot.fill(params),
        tooltip: "Edit content",
        "data-test-id": "cmsContent",
      }}
      schemaButton={{
        href: match.pathParams.tableId
          ? APP_ROUTES.cmsModelSchema.fill({
              ...params,
              tableId: match.pathParams.tableId,
            })
          : APP_ROUTES.cmsSchemaRoot.fill(params),
        tooltip: "Edit models",
        "data-test-id": "cmsModels",
      }}
      settingsButton={{
        style: shouldHideSettingsButton ? { display: "none" } : {},
        href: APP_ROUTES.cmsSettings.fill(params),
        tooltip: "CMS Settings",
        "data-test-id": "cmsSettings",
      }}
    />
  );
}

const CmsLeftTabs = React.forwardRef(CmsLeftTabs_);
export default CmsLeftTabs;
