import { useCmsDatabase } from "@/wab/client/components/cms/cms-contexts";
import { Spinner } from "@/wab/client/components/widgets";
import { useApi } from "@/wab/client/contexts/AppContexts";
import {
  DefaultCmsRootProps,
  PlasmicCmsRoot,
} from "@/wab/client/plasmic/plasmic_kit_cms/PlasmicCmsRoot";
import { CmsDatabaseId } from "@/wab/shared/ApiSchema";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { fillRoute } from "@/wab/shared/route/route";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";
import { Redirect, Route, Switch } from "react-router";

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
    <Switch>
      <Route
        path={APP_ROUTES.cmsContentRoot.pattern}
        render={({ match }) => (
          <PlasmicCmsRoot root={{ ref }} activeTab={"content"} {...rest} />
        )}
      />
      <Route
        path={APP_ROUTES.cmsSchemaRoot.pattern}
        render={({ match }) => (
          <PlasmicCmsRoot root={{ ref }} activeTab={"schema"} {...rest} />
        )}
      />
      <Route
        path={APP_ROUTES.cmsSettings.pattern}
        render={() => (
          <PlasmicCmsRoot root={{ ref }} activeTab={"settings"} {...rest} />
        )}
      />
      <Route>
        <Redirect
          to={fillRoute(APP_ROUTES.cmsContentRoot, { databaseId: databaseId })}
        />
      </Route>
    </Switch>
  );
}

const CmsRoot = React.forwardRef(CmsRoot_);
export default CmsRoot;
