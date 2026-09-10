import { ModalScope } from "@/wab/client/components/widgets/ModalScope";
import { useTrackOpenModal } from "@/wab/client/components/widgets/open-modals";
// eslint-disable-next-line no-restricted-imports
import { Modal as AntdModal, ModalProps } from "antd";
import * as React from "react";
import { useCallback } from "react";

/** Wrapper around antd Modal to provide proper focus trapping. */
export function Modal({ modalRender, ...props }: ModalProps) {
  useTrackOpenModal(props.open ?? props.visible ?? false);
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
