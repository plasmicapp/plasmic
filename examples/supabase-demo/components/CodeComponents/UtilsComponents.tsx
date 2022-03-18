import { Modal } from "antd";
import "antd/dist/antd.css";
import React, { MouseEvent, ReactNode, useContext } from "react";
import {
  DeleteButtonContext,
  SupabaseMutationContext,
  useAllContexts,
} from "./Contexts";
import { getPropValue } from "./DatabaseComponents";

interface SupabaseEditButtonProps {
  children?: ReactNode;
  id?: string;
  className?: string;
  editPage?: string;
}

export function SupabaseEditButton(props: SupabaseEditButtonProps) {
  const { children, id, className, editPage } = props;
  const ref = React.createRef<HTMLAnchorElement>();
  const contexts = useAllContexts();

  // Error messages
  if (!id) {
    return <p>You need to set the id prop</p>;
  } else if (!editPage) {
    return <p>You need to set the editPage prop</p>;
  }

  const val = getPropValue(id, contexts);

  // Note: This hack stores the id in localStorage so that if we navigate to `editPage`,
  // we know which post to pull up, because we aren't using URL parameters
  const onClick = () => {
    localStorage.setItem("id", val);
    ref.current?.click();
  };
  return (
    <div className={className} onClick={onClick}>
      {children}
      <a href={editPage} ref={ref} hidden={true} />
    </div>
  );
}

interface SupabaseDeleteButtonProps {
  children?: ReactNode;
  id?: string;
  className?: string;
  modal?: any;
}

export function SupabaseDeleteButton(props: SupabaseDeleteButtonProps) {
  const { children, id, className, modal } = props;
  const contexts = useAllContexts();
  const [count, setCount] = React.useState(0);

  if (!id) {
    return <p>You need to set the id prop</p>;
  }
  const val = getPropValue(id, contexts);

  // Note: This hack stores the id in localStorage so that if we navigate to `editPage`,
  // we know which post to pull up, because we aren't using URL parameters
  const onClick = () => {
    localStorage.setItem("id", val);
    setCount((c) => c + 1);
  };
  const onCancel = (e: MouseEvent) => {
    e.stopPropagation();
  };
  const onOk = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className={className} onClick={onClick}>
      {children}
      <DeleteButtonContext.Provider value={{ id, count, onCancel, onOk }}>
        {modal}
      </DeleteButtonContext.Provider>
    </div>
  );
}

interface SupabaseModalProps {
  children?: ReactNode;
  className?: string;
  count?: boolean;
  onCancel?: (e: MouseEvent) => void;
  onOk?: (e: MouseEvent) => void;
  showModal?: boolean;
}

export function SupabaseModal(props: SupabaseModalProps) {
  const { children, className, showModal } = props;

  const [visible, setVisible] = React.useState(false);
  const deleteButtonCtx = useContext(DeleteButtonContext);
  const mutationCtx = useContext(SupabaseMutationContext);
  const { count, onCancel: onCancelCtx, onOk: onOkCtx } = deleteButtonCtx ?? {};

  // Show if button has been pressed at least once
  React.useEffect(() => {
    if (count) {
      setVisible(true);
    }
  }, [count]);

  const onCancel = (e: MouseEvent) => {
    setVisible(false);
    if (props.onCancel && onCancelCtx) {
      onCancelCtx(e);
    }
    e.stopPropagation();
  };

  const onOk = (e: MouseEvent) => {
    setVisible(false);
    if (props.onOk && onOkCtx) {
      onOkCtx(e);
    }
    if (mutationCtx) {
      mutationCtx.onSubmit({});
    }
    e.stopPropagation();
  };

  return (
    <Modal
      title="Delete item"
      className={className}
      visible={visible || showModal}
      onCancel={onCancel}
      onOk={onOk}
    >
      {children}
    </Modal>
  );
}
