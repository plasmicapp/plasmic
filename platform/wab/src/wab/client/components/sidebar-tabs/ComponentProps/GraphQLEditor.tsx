import { reactConfirm } from "@/wab/client/components/quick-modals";
import { ObserverLoadable } from "@/wab/client/components/widgets";
import Chip from "@/wab/client/components/widgets/Chip";
import React from "react";
import { Modal } from "@/wab/client/components/widgets/Modal";

export interface GraphQLValue {
  query: string;
  variables?: Record<string, any>;
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

  const tryJsonParse = (str: string) => {
    try {
      return JSON.parse(str);
    } catch {
      return {};
    }
  };

  const modalProps = {
    visible: show,
    width: "80%",
    minWidth: 1024,
    bodyStyle: { overflowX: "scroll" as any, padding: 8 },
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
            <div
              style={{
                height: "80vh",
                minHeight: 512,
              }}
              className="flex-col"
            >
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
                    defaultVariables={JSON.stringify(value?.variables ?? {})}
                    method={method}
                    onCancel={onCancel}
                    onSave={(query, variables) => {
                      onChange?.({ query, variables: tryJsonParse(variables) });
                      setShow(false);
                    }}
                  />
                )}
              />
            </div>
          )}
        </Modal>
      )}
    </>
  );
};
