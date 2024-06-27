// eslint-disable-next-line no-restricted-imports
import { Modal as AntdModal, ModalProps } from "antd";
import * as React from "react";
import { useCallback } from "react";
import { ModalScope } from "@/wab/client/components/widgets/ModalScope";

/** Wrapper around antd Modal to provide proper focus trapping. */
export function Modal({ modalRender, ...props }: ModalProps) {
  const wrappedModalRender = useCallback(
    (node: React.ReactNode) => {
      const wrappedNode = (
        <ModalScope allowKeyCombos={["esc"]}>{node}</ModalScope>
      );
      if (modalRender) {
        return modalRender(wrappedNode);
      } else {
        return wrappedNode;
      }
    },
    [modalRender]
  );
  return <AntdModal modalRender={wrappedModalRender} {...props} />;
}
