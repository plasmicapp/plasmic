import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";
import { useRouteMatch } from "react-router";
import { ensure } from "../../../common";
import { accessLevelRank } from "../../../shared/EntUtil";
import { UU } from "../../cli-routes";
import { useAppCtx } from "../../contexts/AppContexts";
import {
  DefaultCmsLeftTabsProps,
  PlasmicCmsLeftTabs,
} from "../../plasmic/plasmic_kit_cms/PlasmicCmsLeftTabs";
import { useCmsDatabase } from "./cms-contexts";

export interface CmsLeftTabsProps extends DefaultCmsLeftTabsProps {}

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
          ? UU.cmsModelContent.fill({
              ...params,
              tableId: match.params.tableId,
            })
          : UU.cmsContentRoot.fill(params),
        tooltip: "Edit content",
        "data-test-id": "cmsContent",
      }}
      schemaButton={{
        href: match.params.tableId
          ? UU.cmsModelSchema.fill({ ...params, tableId: match.params.tableId })
          : UU.cmsSchemaRoot.fill(params),
        tooltip: "Edit models",
        "data-test-id": "cmsModels",
      }}
      settingsButton={{
        style: shouldHideSettingsButton ? { display: "none" } : {},
        href: UU.cmsSettings.fill(params),
        tooltip: "CMS Settings",
        "data-test-id": "cmsSettings",
      }}
    />
  );
}

const CmsLeftTabs = React.forwardRef(CmsLeftTabs_);
export default CmsLeftTabs;
