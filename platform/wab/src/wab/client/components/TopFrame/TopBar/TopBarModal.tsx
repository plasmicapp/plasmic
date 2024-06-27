import sty from "@/wab/client/components/TopFrame/TopBar/TopBarModal.module.css";
import React, { ComponentProps } from "react";
import { Modal } from "@/wab/client/components/widgets/Modal";

export function TopBarModal(
  props: ComponentProps<typeof Modal> & {
    children?: React.ReactNode;
    onClose?: () => void;
  }
) {
  const { children, onClose, ...rest } = props;
  return (
    <Modal
      visible={true}
      footer={null}
      closable={false}
      maskClosable={true}
      onCancel={onClose}
      onOk={onClose}
      wrapClassName={sty.wrapper}
      style={{
        width: "auto",
        top: 49,
        right: 10,
      }}
      afterClose={onClose}
      {...rest}
    >
      {children}
    </Modal>
  );
}
