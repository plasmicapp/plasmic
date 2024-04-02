import { useViewCtx } from "@/wab/client/contexts/StudioContexts";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ensure } from "@/wab/common";
import { observer } from "mobx-react";
import React, { useState } from "react";

const _RestQueryControl = observer(function RestQueryControl({
  query,
}: {
  query: any /* RestQuery */;
}) {
  const sc = useStudioCtx();
  const vc = useViewCtx();
  const [method, setMethod] = useState(query.method);
  const [url, setUrl] = useState(query.url);
  return (
    <div>
      <div>
        Method:{" "}
        <input
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          onBlur={(e) => sc.changeUnsafe(() => (query.method = method))}
        />
      </div>
      <div>
        URL:{" "}
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={(e) => sc.changeUnsafe(() => (query.url = url))}
        />
      </div>
    </div>
  );
});
const _FetcherQueryControl = observer(function FetcherQueryControl({
  query,
}: {
  query: any /* FetcherQuery */;
}) {
  const sc = useStudioCtx();
  const vc = useViewCtx();
  const fetcher = ensure(
    sc.codeFetchersRegistry
      .getRegisteredCodeFetchersMap()
      .get(query.fetcherName),
    () => `Couldn't find fetcher ${query.fetcherName}`
  );
  return (
    <div>
      {fetcher.meta.displayName}
      {fetcher.meta.args.map((arg) => {
        const nameArg = query.nameArgs.find((a) => a.name === arg.name);
        return (
          <div key={arg.name}>
            <div>{arg.name}</div>
            <div>{arg.type}</div>
            <div>
              {/*<ExprVal
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
              />*/}
            </div>
          </div>
        );
      })}
    </div>
  );
});

export const ComponentQueriesSection = observer(
  function ComponentQueriesSection() {
    const sc = useStudioCtx();
    const vc = useViewCtx();

    return (
      <div>
        {/*
        <div>
          {vc.component.queries.map((query) => {
            return switchType(query)
              .when(FetcherQuery, (q) => (
                <FetcherQueryControl query={q} key={q.uid} />
              ))
              .when(RestQuery, (q) => (
                <RestQueryControl query={q} key={q.uid} />
              ))
              .when(GraphqlQuery, (q) => todo("GraphqlQuery"))
              .result();
          })}
          <button onClick={async () => addQuery(mkRestQuery({}))}>
            Add REST query
          </button>
          Add fetcher:
          {[
            ...sc.codeFetchersRegistry.getRegisteredCodeFetchersMap().entries(),
          ].map(([fetcherName, { meta }]) => (
            <button
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
            </button>
          ))}
            </div>*/}
      </div>
    );
  }
);
