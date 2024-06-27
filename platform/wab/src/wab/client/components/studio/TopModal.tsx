import sty from "@/wab/client/components/studio/TopModal.module.css";
import React from "react";
import { Modal } from "@/wab/client/components/widgets/Modal";

export function TopModal(props: {
  children?: React.ReactNode;
  title?: React.ReactNode;
  onClose?: () => void;
}) {
  const { children, title, onClose } = props;

  return (
    <Modal
      title={title}
      visible={true}
      footer={null}
      closable={false}
      maskClosable={true}
      onCancel={onClose}
      onOk={onClose}
      wrapClassName={sty.wrapper}
      style={{
        width: "auto",
        top: 0,
        right: 10,
      }}
      afterClose={onClose}
    >
      {children}
    </Modal>
  );
}
