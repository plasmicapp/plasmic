import { Modal as AntdModal } from "antd";
import "antd/dist/antd.css";
import React, { ReactNode, useState } from "react";

export interface ModalProps {
  children?: ReactNode;
  closeIcon?: ReactNode;
  isVisible?: boolean;
  className?: string;
  width?: string;
  onClose?: () => void;
}

export function Modal(props: ModalProps) {
  const [isModalVisible, setIsModalVisible] = useState(props.isVisible);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleOk = () => {
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    if (props.onClose) props.onClose();
  };

  return (
    <AntdModal
      visible={isModalVisible}
      onOk={handleOk}
      onCancel={handleCancel}
      footer={null}
      closeIcon={props.closeIcon}
      bodyStyle={{ padding: 0 }}
      className={props.className}
      width={props.width ?? "70%"}
    >
      {props.children}
    </AntdModal>
  );
}
