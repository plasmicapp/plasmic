import { reactConfirm } from "@/wab/client/components/quick-modals";
import { ObserverLoadable } from "@/wab/client/components/widgets";
import Chip from "@/wab/client/components/widgets/Chip";
import { Modal } from "@/wab/client/components/widgets/Modal";
import {
  JsonObject,
  jsonStringify,
  tryJsonParse,
} from "@/wab/shared/core/lang";
import React from "react";

export interface GraphQLValue {
  query: string;
  variables?: JsonObject;
}

export const GraphQLEditor = (props: {
  title: string;
  value?: GraphQLValue | null;
  onChange?: (value: GraphQLValue | null | undefined) => void;
  endpoint: string;
  method?: string;
  headers?: Record<string, string>;
}) => {
  const { title, value, onChange, endpoint, headers, method } = props;

  const [show, setShow] = React.useState<boolean>(false);
  const onCancel = async () => {
    const confirm = await reactConfirm({
      message: "Are you sure you want to discard your changes?",
      confirmLabel: "Discard",
      cancelLabel: "Keep editing",
    });
    if (confirm) {
      setShow(false);
    }
  };

  const modalProps = {
    visible: show,
    width: "80%",
    minWidth: 1024,
    bodyStyle: {
      height: "75vh",
      maxHeight: "75vh",
      padding: 0,
    },
    footer: null,
    onCancel,
  };
  return (
    <>
      <div className="flex-fill flex-left text-ellipsis">
        <Chip onClick={() => setShow(true)}>
          <span className="line-clamp-3 text-align-left">
            {value ? JSON.stringify(value) : "unset"}
          </span>
        </Chip>
      </div>
      {show && (
        // Unmount the GraphiQLExplorer component when the modal closes
        <Modal {...modalProps} title={title}>
          {show && (
            <ObserverLoadable
              loader={() =>
                import("@/wab/client/data/GraphqlBuilder").then(
                  ({ default: GraphiqlWithExplorer }) => GraphiqlWithExplorer
                )
              }
              contents={(GraphiqlWithExplorer) => (
                <GraphiqlWithExplorer
                  url={endpoint}
                  headers={headers}
                  defaultQuery={value?.query ?? ""}
                  defaultVariables={jsonStringify(
                    value?.variables ?? ({} as any)
                  )}
                  method={method}
                  onCancel={onCancel}
                  onSave={(query, variables) => {
                    onChange?.({
                      query,
                      variables: tryJsonParse<JsonObject>(variables),
                    });
                    setShow(false);
                  }}
                />
              )}
            />
          )}
        </Modal>
      )}
    </>
  );
};
