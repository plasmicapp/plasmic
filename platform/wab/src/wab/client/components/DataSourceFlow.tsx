import React, { useState } from "react";
// import { FetcherQuerySettings } from "../../../QueriesSection";
// import RestBuilder from "../../../RestBuilder";
import { BuiltinDataSourceName } from "@/wab/shared/data/DataSources";
// import { GraphqlBuilder } from "../data/GraphqlBuilder";
import { TopModal } from "@/wab/client/components/studio/TopModal";

export function DataSourceFlow({ onDone }: { onDone: (query?: any) => void }) {
  const [state, setState] = useState({ state: "initial" });
  const [currentNode, setCurrentNode] = useState<
    BuiltinDataSourceName | undefined
  >(undefined);
  return (
    <TopModal
      onClose={() => {
        if (confirm("Discard changes?")) {
          onDone();
        }
      }}
    >
      <div>
        {/*!currentNode ? (
          <div style={{ width: 800 }}>
            <DataSourceBrowser onNext={(node) => setCurrentNode(node)} />
          </div>
        ) : isKnownRestQuery(currentNode) ? (
          <div style={{ width: 800 }}>
            <RestBuilder query={currentNode} onSubmit={onDone} />
          </div>
        ) : isKnownGraphqlQuery(currentNode) ? (
          <GraphqlBuilder defaultQuery={currentNode} onSubmit={onDone} />
        ) : isKnownFetcherQuery(currentNode) ? (
          <div style={{ width: 800 }}>
            <FetcherQuerySettings query={currentNode} />
          </div>
        ) : currentNode === "ShopifySource" ? (
          <div style={{ width: 500 }}>
            <ConnectToDataSource
              sourceName={currentNode}
              onCancel={() => onDone()}
              onNext={(source) => {
                setCurrentNode(
                  mkGraphqlQuery({
                    builtinQuery: {},
                  })
                );
              }}
            />
          </div>
        ) : (
          unexpected()
        )*/}
      </div>
    </TopModal>
  );
}
