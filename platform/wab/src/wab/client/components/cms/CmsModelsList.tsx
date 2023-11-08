import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { sortBy } from "lodash";
import * as React from "react";
import { useHistory, useRouteMatch } from "react-router";
import { CmsDatabaseId, CmsTableId } from "../../../shared/ApiSchema";
import { UU } from "../../cli-routes";
import { useApi } from "../../contexts/AppContexts";
import {
  DefaultCmsModelsListProps,
  PlasmicCmsModelsList,
} from "../../plasmic/plasmic_kit_cms/PlasmicCmsModelsList";
import { reactPrompt } from "../quick-modals";
import { Matcher } from "../view-common";
import { useCmsDatabase, useMutateTables } from "./cms-contexts";
import CmsModelItem from "./CmsModelItem";

export interface CmsModelsListProps extends DefaultCmsModelsListProps {}

function CmsModelsList_(
  props: CmsModelsListProps,
  ref: HTMLElementRefOf<"div">
) {
  const match = useRouteMatch<{
    databaseId: CmsDatabaseId;
    tableId?: CmsTableId;
  }>();
  const { databaseId } = match.params;
  const database = useCmsDatabase(databaseId);
  const api = useApi();
  const mutateTables = useMutateTables();
  const history = useHistory();
  const [query, setQuery] = React.useState("");
  const matcher = new Matcher(query);
  const tables = database ? sortBy(database.tables, (table) => table.name) : [];
  const filteredTables = tables.filter(
    (t) => matcher.matches(t.name) || matcher.matches(t.identifier)
  );
  return (
    <PlasmicCmsModelsList
      {...props}
      root={{ ref }}
      searchInput={{
        value: query,
        onChange: (e) => setQuery(e.target.value),
      }}
      children={
        <>
          {filteredTables.map((table) => (
            <CmsModelItem key={table.id} table={table} matcher={matcher} />
          ))}
        </>
      }
      addModelButton={{
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onClick: async () => {
          const name = await reactPrompt({
            message: `Enter the name for your new CMS table`,
            placeholder: "Table name",
            actionText: "Add",
          });
          if (!name) {
            return;
          }
          const table = await api.createCmsTable(databaseId, {
            name,
            identifier: name,
          });
          await mutateTables(databaseId);
          history.push(
            UU.cmsModelSchema.fill({ databaseId, tableId: table.id })
          );
        },
        "data-test-id": "addModelButton",
      }}
    />
  );
}

const CmsModelsList = React.forwardRef(CmsModelsList_);
export default CmsModelsList;
