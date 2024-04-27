import { useRRouteMatch, UU } from "@/wab/client/cli-routes";
import {
  useCmsDatabase,
  useMutateDatabase,
} from "@/wab/client/components/cms/cms-contexts";
import { useApi } from "@/wab/client/contexts/AppContexts";
import {
  DefaultCmsTopBarProps,
  PlasmicCmsTopBar,
} from "@/wab/client/plasmic/plasmic_kit_cms/PlasmicCmsTopBar";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

export type CmsTopBarProps = DefaultCmsTopBarProps;

function CmsTopBar_(props: CmsTopBarProps, ref: HTMLElementRefOf<"div">) {
  const match = useRRouteMatch(UU.cmsRoot)!;
  const database = useCmsDatabase(match?.params.databaseId);
  const api = useApi();
  const mutateDatabase = useMutateDatabase();
  return (
    <PlasmicCmsTopBar
      root={{ ref }}
      cmsNameValue={database?.name}
      cmsName={{
        value: database?.name,
        onChange: async (newName) => {
          await api.updateCmsDatabase(database!.id, { name: newName });
          await mutateDatabase(database!.id);
        },
      }}
      {...props}
    />
  );
}

const CmsTopBar = React.forwardRef(CmsTopBar_);
export default CmsTopBar;
