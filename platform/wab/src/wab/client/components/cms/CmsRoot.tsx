import { UU } from "@/wab/client/cli-routes";
import { useCmsDatabase } from "@/wab/client/components/cms/cms-contexts";
import { Spinner } from "@/wab/client/components/widgets";
import { useApi } from "@/wab/client/contexts/AppContexts";
import {
  DefaultCmsRootProps,
  PlasmicCmsRoot,
} from "@/wab/client/plasmic/plasmic_kit_cms/PlasmicCmsRoot";
import { CmsDatabaseId } from "@/wab/shared/ApiSchema";
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
        path={UU.cmsContentRoot.pattern}
        render={({ match }) => (
          <PlasmicCmsRoot root={{ ref }} activeTab={"content"} {...rest} />
        )}
      />
      <Route
        path={UU.cmsSchemaRoot.pattern}
        render={({ match }) => (
          <PlasmicCmsRoot root={{ ref }} activeTab={"schema"} {...rest} />
        )}
      />
      <Route
        path={UU.cmsSettings.pattern}
        render={() => (
          <PlasmicCmsRoot root={{ ref }} activeTab={"settings"} {...rest} />
        )}
      />
      <Route>
        <Redirect to={UU.cmsContentRoot.fill({ databaseId: databaseId })} />
      </Route>
    </Switch>
  );
}

const CmsRoot = React.forwardRef(CmsRoot_);
export default CmsRoot;
