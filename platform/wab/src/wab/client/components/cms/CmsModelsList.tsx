import { UU } from "@/wab/client/cli-routes";
import {
  useCmsDatabase,
  useMutateTables,
} from "@/wab/client/components/cms/cms-contexts";
import CmsModelItem from "@/wab/client/components/cms/CmsModelItem";
import { reactPrompt } from "@/wab/client/components/quick-modals";
import { Matcher } from "@/wab/client/components/view-common";
import { useApi } from "@/wab/client/contexts/AppContexts";
import {
  DefaultCmsModelsListProps,
  PlasmicCmsModelsList,
} from "@/wab/client/plasmic/plasmic_kit_cms/PlasmicCmsModelsList";
import { CmsDatabaseId, CmsTableId } from "@/wab/shared/ApiSchema";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { partition, sortBy } from "lodash";
import * as React from "react";
import { useHistory, useRouteMatch } from "react-router";

export type CmsModelsListProps = DefaultCmsModelsListProps;

function CmsModelsList_(
  props: CmsModelsListProps,
  ref: HTMLElementRefOf<"div">
) {
  const match = useRouteMatch<{
    databaseId: CmsDatabaseId;
    tableId?: CmsTableId;
  }>();
  const { databaseId, tableId } = match.params;
  const database = useCmsDatabase(databaseId);
  const api = useApi();
  const mutateTables = useMutateTables();
  const history = useHistory();
  const [query, setQuery] = React.useState("");
  const matcher = new Matcher(query);
  const tables = database ? sortBy(database.tables, (table) => table.name) : [];
  const searchFilterTables = tables.filter(
    (t) => matcher.matches(t.name) || matcher.matches(t.identifier)
  );
  const [filteredTables, archivedTables] = partition(
    searchFilterTables,
    (t) => !t.isArchived
  );
  const collapsedState = React.useState(
    tableId && archivedTables.some((t) => t.id === tableId) ? false : true
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
      hasArchivedModels={archivedTables.length > 0}
      archivedModelsSection={{
        isCollapsible: true,
        collapsedState: collapsedState,
        headerClassName: "flex-no-shrink",
      }}
      archivedModels={
        <>
          {archivedTables.map((table) => (
            <CmsModelItem key={table.id} table={table} matcher={matcher} />
          ))}
        </>
      }
    />
  );
}

const CmsModelsList = React.forwardRef(CmsModelsList_);
export default CmsModelsList;
