import { useCmsDatabase } from "@/wab/client/components/cms/cms-contexts";
import { Spinner } from "@/wab/client/components/widgets";
import { useApi } from "@/wab/client/contexts/AppContexts";
import {
  DefaultCmsRootProps,
  PlasmicCmsRoot,
} from "@/wab/client/plasmic/plasmic_kit_cms/PlasmicCmsRoot";
import { Redirect } from "@/wab/client/route/Redirect";
import { Switch, switchCase, switchDefault } from "@/wab/client/route/Switch";
import { CmsDatabaseId } from "@/wab/shared/ApiSchema";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

export interface CmsRootProps extends DefaultCmsRootProps {
  databaseId: CmsDatabaseId;
}

function CmsRoot_(props: CmsRootProps, ref: HTMLElementRefOf<"div">) {
  const { databaseId, ...rest } = props;
  const api = useApi();
  const database = useCmsDatabase(databaseId);
  if (!database) {
    return <Spinner />;
  }
  return (
    <Switch
      cases={[
        switchCase({
          route: APP_ROUTES.cmsContentRoot,
          render: () => (
            <PlasmicCmsRoot root={{ ref }} activeTab={"content"} {...rest} />
          ),
        }),
        switchCase({
          route: APP_ROUTES.cmsSchemaRoot,
          render: () => (
            <PlasmicCmsRoot root={{ ref }} activeTab={"schema"} {...rest} />
          ),
        }),
        switchCase({
          route: APP_ROUTES.cmsSettings,
          render: () => (
            <PlasmicCmsRoot root={{ ref }} activeTab={"settings"} {...rest} />
          ),
        }),
        switchDefault({
          render: () => (
            <Redirect
              to={APP_ROUTES.cmsContentRoot.fill({ databaseId: databaseId })}
            />
          ),
        }),
      ]}
    />
  );
}

const CmsRoot = React.forwardRef(CmsRoot_);
export default CmsRoot;
