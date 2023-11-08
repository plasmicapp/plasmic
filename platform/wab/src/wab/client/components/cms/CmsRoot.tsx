import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";
import { Redirect, Route, Switch } from "react-router";
import useSWR from "swr";
import { CmsDatabaseId } from "../../../shared/ApiSchema";
import { UU } from "../../cli-routes";
import { useApi } from "../../contexts/AppContexts";
import {
  DefaultCmsRootProps,
  PlasmicCmsRoot,
} from "../../plasmic/plasmic_kit_cms/PlasmicCmsRoot";
import { Spinner } from "../widgets";

export interface CmsRootProps extends DefaultCmsRootProps {
  databaseId: CmsDatabaseId;
}

function CmsRoot_(props: CmsRootProps, ref: HTMLElementRefOf<"div">) {
  const { databaseId, ...rest } = props;
  const api = useApi();
  const { data: database } = useSWR(`/cms/${databaseId}`, async () =>
    api.getCmsDatabase(databaseId)
  );
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
