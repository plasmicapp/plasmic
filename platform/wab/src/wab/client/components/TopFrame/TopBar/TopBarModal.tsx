import sty from "@/wab/client/components/TopFrame/TopBar/TopBarModal.module.css";
import { Modal } from "@/wab/client/components/widgets/Modal";
import React, { ComponentProps } from "react";

export function TopBarModal(
  props: ComponentProps<typeof Modal> & {
    children?: React.ReactNode;
    onClose?: () => void;
    open?: boolean;
  }
) {
  const { children, onClose, open = true, ...rest } = props;
  return (
    <Modal
      open={open}
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
