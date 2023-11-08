import React, { CSSProperties } from "react";
import { Modal } from "src/wab/client/components/widgets/Modal";
import sty from "./BareModal.module.css";

interface BareModalProps {
  children?: React.ReactNode;
  onClose?: () => void;
  style?: CSSProperties;
  width?: string | number;
}

export function BareModal(props: BareModalProps) {
  const { children, onClose, style, width } = props;
  return (
    <Modal
      visible={true}
      footer={null}
      closable={false}
      maskClosable={true}
      onCancel={onClose}
      onOk={onClose}
      wrapClassName={sty.wrapper}
      style={style}
      afterClose={onClose}
      width={width}
    >
      {children}
    </Modal>
  );
}
