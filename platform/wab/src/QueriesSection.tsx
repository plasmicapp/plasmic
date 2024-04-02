import { observer } from "mobx-react";
// import KeyValueRow from "./KeyValueRow";
// import ListBuilder from "./ListBuilder";
// import RestBuilder from "./RestBuilder";
// import { DataSourceFlow } from "./wab/client/components/DataSourceFlow";
// import { ExprVal } from "./wab/client/components/sidebar-tabs/data-tab";
// import { VarName } from "./wab/client/components/sidebar/expr-editor";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { DefaultQueriesSectionProps } from "./wab/client/plasmic/plasmic_kit_data_queries/PlasmicQueriesSection";

type QueriesSectionProps = DefaultQueriesSectionProps
/*
const TypicalQueryControl = observer(function RestQueryControl({
  query,
  summary,
  children,
  onShow,
}: {
  query: Query;
  summary: ReactNode;
  children: ReactNode;
  onShow: () => void;
}) {
  const vc = useViewCtx();
  return (
    <>
      <KeyValueRow
        keyLabel={<VarName variable={query.returnVar} viewCtx={vc} />}
        readOnlyKey
        readOnlyValue
        value={
          <LinkButton
            onClick={onShow}
            className={"text-ellipsis"}
            style={{ display: "block" }}
          >
            {summary}
          </LinkButton>
        }
        icon={<DotsVerticalIcon />}
        iconButton={{
          wrap: (node) => (
            <IFrameAwareDropdownMenu
              menu={
                <Menu>
                  <Menu.Item onClick={onShow}>Configure</Menu.Item>
                  <Menu.Item
                    onClick={() => {
                      remove(vc.component.queries, query);
                    }}
                  >
                    Delete
                  </Menu.Item>
                </Menu>
              }
            >
              {node}
            </IFrameAwareDropdownMenu>
          ),
        }}
      />
      {children}
    </>
  );
});

const RestQueryRow = observer(function RestQueryControl({
  query,
}: {
  query: RestQuery;
}) {
  const sc = useStudioCtx();
  const vc = useViewCtx();
  const [showModal, setShowModal] = useState(false);
  return (
    <TypicalQueryControl
      query={query}
      summary={query.url}
      onShow={() => setShowModal(true)}
    >
      {showModal && (
        <TopModal onClose={() => setShowModal(false)}>
          <div style={{ width: 800 }}>
            <RestBuilder query={query} onSubmit={() => setShowModal(false)} />
          </div>
        </TopModal>
      )}
    </TypicalQueryControl>
  );
});

function FetcherQuerySettings({ query }: { query: FetcherQuery }) {
  const sc = useStudioCtx();
  const vc = useViewCtx();
  const fetcher = ensure(
    sc.codeFetchersRegistry
      .getRegisteredCodeFetchersMap()
      .get(query.fetcherName),
    () => `Couldn't get fetcher ${query.fetcherName}`
  );
  return (
    <div style={{ padding: 16 }}>
      <ListBuilder title={`${fetcher.meta.displayName} params`}>
        {fetcher.meta.args.map((arg) => {
          const nameArg = query.nameArgs.find((a) => a.name === arg.name);
          return (
            <div key={arg.name}>
              <KeyValueRow
                readOnlyKey
                readOnlyValue
                noIconButton
                keyLabel={
                  <div>
                    <div className={"code"}>{arg.name}</div>
                    <div>{arg.type}</div>
                  </div>
                }
                value={
                  <ExprVal
                    viewCtx={vc}
                    expr={nameArg?.expr}
                    tpl={vc.component.tplTree}
                    onChange={(newExpr) => {
                      if (!nameArg) {
                        query.nameArgs.push(
                          mkNameArg({ name: arg.name, expr: newExpr })
                        );
                      } else {
                        nameArg.expr = newExpr;
                      }
                    }}
                  />
                }
              />
            </div>
          );
        })}
      </ListBuilder>
    </div>
  );
}

function FetcherQuerySettingsModal({
  onClose,
  query,
  showModal,
}: {
  onClose: () => void;
  query: FetcherQuery;
  showModal: boolean;
}) {
  const sc = useStudioCtx();
  const vc = useViewCtx();
  const fetcher = ensure(
    sc.codeFetchersRegistry
      .getRegisteredCodeFetchersMap()
      .get(query.fetcherName),
    () => `Couldn't get fetcher ${query.fetcherName}`
  );
  return (
    <SidebarModalProvider containerSelector=".canvas-editor__right-pane">
      <SidebarModal show={showModal} onClose={onClose}>
        <FetcherQuerySettings query={query} />
      </SidebarModal>
    </SidebarModalProvider>
  );
}

const FetcherQueryRow = observer(function FetcherQueryControl({
  query,
}: {
  query: FetcherQuery;
}) {
  const sc = useStudioCtx();
  const vc = useViewCtx();
  const [showModal, setShowModal] = useState(false);
  const fetcher = ensure(
    sc.codeFetchersRegistry
      .getRegisteredCodeFetchersMap()
      .get(query.fetcherName),
    () => `Couldn't get fetcher ${query.fetcherName}`
  );
  return (
    <TypicalQueryControl
      query={query}
      summary={fetcher.meta.displayName}
      onShow={() => setShowModal(true)}
    >
      <FetcherQuerySettingsModal
        onClose={() => setShowModal(false)}
        query={query}
        showModal={showModal}
      />
    </TypicalQueryControl>
  );
});
*/

export const QueriesSection = observer(function QueriesSection(
  props: QueriesSectionProps
) {
  /*
  const sc = useStudioCtx();
  const vc = useViewCtx();
  const [showModal, setShowModal] = useState(false);

  const addQuery = async (query: Query) =>
    sc.changeUnsafe(() => {
      vc.component.queries.push(query);
    });

  const fetchers = [
    ...sc.codeFetchersRegistry.getRegisteredCodeFetchersMap().entries(),
  ];

  return (
    <>
      {showModal && (
        <DataSourceFlow
          onDone={async (query) => {
            if (query) {
              await addQuery(query);
            }
            setShowModal(false);
          }}
        />
      )}
      <PlasmicQueriesSection
        {...props}
        queriesList={{
          props: {
            children: vc.component.queries.map((query) => {
              return switchType(query)
                .when(FetcherQuery, (q) => (
                  <FetcherQueryRow query={q} key={q.uid} />
                ))
                .when(RestQuery, (q) => <RestQueryRow query={q} key={q.uid} />)
                .when(GraphqlQuery, (q) => todo("GraphqlQuery"))
                .result();
            }),
            addButton: {
              wrap: (node) => (
                <IFrameAwareDropdownMenu
                  menu={
                    <Menu>
                      <Menu.Item
                        onClick={async () => addQuery(mkRestQuery({}))}
                      >
                        Generic REST query
                      </Menu.Item>
                      <Menu.Item
                        onClick={() => {
                          setShowModal(true);
                        }}
                      >
                        Choose data source
                      </Menu.Item>
                      {fetchers.length > 0 && <Menu.Divider />}
                      {fetchers.map(([fetcherName, { impl, meta }]) => (
                        <Menu.Item
                          key={fetcherName}
                          onClick={async () =>
                            addQuery(
                              mkFetcherQuery({
                                fetcherName,
                              })
                            )
                          }
                        >
                          {meta.displayName}
                        </Menu.Item>
                      ))}
                    </Menu>
                  }
                >
                  {node}
                </IFrameAwareDropdownMenu>
              ),
            },
          },
        }}
      />
    </>
  );*/
  return null;
});

export default QueriesSection;
