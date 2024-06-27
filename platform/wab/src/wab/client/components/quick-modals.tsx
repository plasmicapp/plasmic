import Button from "@/wab/client/components/widgets/Button";
import Textbox from "@/wab/client/components/widgets/Textbox";
import { zIndex } from "@/wab/client/z-index";
import { joinReactNodes } from "@/wab/commons/components/ReactUtil";
import { getComponentDisplayName } from "@/wab/shared/core/components";
import { FRAMES_CAP, FRAME_LOWER, MIXINS_CAP } from "@/wab/shared/Labels";
import type { AddItemKey } from "@/wab/shared/add-item-keys";
import type {
  ArenaFrame,
  Component,
  Mixin,
  StyleToken,
} from "@/wab/shared/model/classes";
import type { DefaultStyle } from "@/wab/shared/core/styles";
import { Form } from "antd";
import { Rule } from "antd/lib/form";
import React from "react";
import ReactDOM from "react-dom";
import { Modal } from "@/wab/client/components/widgets/Modal";

/**
 * Shows a React element appended to the end of document.  As such, it is outside of
 * the usual React render tree, and would likely only make sense for absolutely-positioned
 * components that don't need to be part of the React context.  It's useful for showing
 * temporary pop-ups and one-offs.
 *
 * The function returns an object with a method `destroy()`, which must be called when
 * you are done to unmount the temporary widget.
 */
function showTemporaryWidget(children: React.ReactElement<any>) {
  const div = document.createElement("div");
  document.body.appendChild(div);
  function destroy() {
    const unmountResult = ReactDOM.unmountComponentAtNode(div);
    if (unmountResult && div.parentNode) {
      div.parentNode.removeChild(div);
    }
  }

  ReactDOM.render(children, div);
  return { destroy };
}

/**
 * Async function that shows a temporary widget to the user, asking for an answer to
 * something.  The user's response will be returned as a Promise from this function;
 * the response is undefined if the user chose not to answer.
 *
 * `children` is a function that takes in two argument functions, and returns the
 * temporary React component that asks the user the question.  The two arguments are:
 *
 * - onSubmit -- to be called with the answer to the prompt.
 * - onCancel -- to be called when the user declines to answer the prompt.
 *
 * Typical usage might look something like:
 *
 * const answer = await showTemporaryPrompt((onSubmit, onCancel) => (
 *   <MySpecialModal onSubmit={onSubmit} onCancel={onCancel} {...opts}/>
 * ));
 * @param children
 */
export async function showTemporaryPrompt<T>(
  children: (
    onSubmit: (val: T) => void,
    onCancel: () => void
  ) => React.ReactElement<any>
) {
  let modalResolve: (result?: T) => void;
  const promise = new Promise<T | undefined>((resolve) => {
    modalResolve = resolve;
  });
  const onSubmit = (val: T) => {
    modalResolve(val);
    temp.destroy();
  };
  const onCancel = () => {
    modalResolve(undefined);
    temp.destroy();
  };
  const node = children(onSubmit, onCancel);
  const temp = showTemporaryWidget(node);
  return promise;
}

export async function showTemporaryInfo(opts: {
  title: React.ReactNode;
  content: React.ReactNode;
  width?: number;
  onClose?: () => void;
}) {
  const { title, content, onClose, width } = opts;
  return showTemporaryPrompt<void>((onSubmit, onCancel) => (
    <Modal
      title={title}
      footer={null}
      onCancel={() => {
        onClose && onClose();
        onCancel();
      }}
      open
      width={width}
    >
      {content}
    </Modal>
  ));
}

export async function confirm(opts: {
  title?: React.ReactNode;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
}) {
  const { title, message, confirmLabel, cancelLabel } = opts;
  return showTemporaryPrompt<boolean>((onSubmit, onCancel) => (
    <Modal
      title={title}
      visible={true}
      footer={null}
      onCancel={onCancel}
      closable={false}
      zIndex={zIndex.quickModal}
    >
      <Form onFinish={() => onSubmit(true)}>
        {message}
        <Form.Item style={{ marginBottom: 0, marginTop: 28 }}>
          <Button
            className="mr-sm"
            type="primary"
            htmlType="submit"
            onClick={() => onSubmit(true)}
            autoFocus
            data-test-id="confirm"
          >
            {confirmLabel ?? "Confirm"}
          </Button>
          <Button onClick={() => onCancel()}>{cancelLabel ?? "Cancel"}</Button>
        </Form.Item>
      </Form>
    </Modal>
  ));
}

export const reactConfirm = confirm;

export async function alert(opts: {
  title?: React.ReactNode;
  message: React.ReactNode;
}) {
  const { title, message } = opts;
  return showTemporaryPrompt<boolean>((onSubmit, onCancel) => (
    <Modal
      title={title}
      visible={true}
      footer={null}
      onCancel={onCancel}
      closable={false}
    >
      <Form onFinish={() => onSubmit(true)}>
        {message}
        <Form.Item style={{ marginBottom: 0, marginTop: 28 }}>
          <Button
            className="mr-sm"
            type="primary"
            htmlType="submit"
            onClick={() => onSubmit(true)}
            autoFocus
          >
            OK
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  ));
}

export const reactAlert = alert;

/**
 * The same as confirm, except the user must type some confirmation message
 * before the "Confirm" button is enabled
 * @param opts
 * @returns
 */
export async function hardConfirm(opts: {
  title?: React.ReactNode;
  message: React.ReactNode;
  mustType: string;
}) {
  return showTemporaryPrompt<boolean>((onSubmit, onCancel) => (
    <HardConfirmForm {...opts} onSubmit={onSubmit} onCancel={onCancel} />
  ));
}

export const reactHardConfirm = hardConfirm;

function HardConfirmForm(props: {
  title?: React.ReactNode;
  message: React.ReactNode;
  mustType: string;
  onSubmit: (v: boolean) => void;
  onCancel: () => void;
}) {
  const { title, message, mustType, onSubmit, onCancel } = props;
  const [readySubmit, setReadySubmit] = React.useState(false);
  return (
    <Modal
      title={title}
      visible={true}
      footer={null}
      onCancel={onCancel}
      closable={false}
    >
      <Form
        onFinish={() => {
          if (readySubmit) {
            onSubmit(true);
          }
        }}
      >
        <Form.Item>{message}</Form.Item>
        <Form.Item>
          <Textbox
            name="input"
            defaultValue={""}
            placeholder={mustType}
            styleType={["bordered"]}
            autoFocus
            data-test-id="prompt"
            onChange={(e) => {
              if (!readySubmit && e.target.value === mustType) {
                setReadySubmit(true);
              } else if (readySubmit && e.target.value !== mustType) {
                setReadySubmit(false);
              }
            }}
          />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0, marginTop: 28 }}>
          <Button
            className="mr-sm"
            type="primary"
            htmlType="submit"
            disabled={!readySubmit}
          >
            Confirm
          </Button>
          <Button onClick={() => onCancel()}>Cancel</Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export type ReactPromptOpts = {
  message: React.ReactNode;
  defaultValue?: string;
  placeholder?: string;
  actionText?: React.ReactNode;
  rules?: Rule[];
};

export async function reactPrompt(opts: ReactPromptOpts) {
  const { message, defaultValue, actionText, placeholder, rules } = opts;
  return showTemporaryPrompt<string | undefined>((onSubmit, onCancel) => (
    <Modal
      title={null}
      visible={true}
      footer={null}
      onCancel={onCancel}
      closable={false}
      wrapClassName="prompt-modal"
      zIndex={zIndex.quickModal}
    >
      <Form
        onFinish={(e) => {
          onSubmit(e.input ?? defaultValue ?? undefined);
        }}
        data-test-id="prompt-form"
        layout="vertical"
      >
        <Form.Item name="input" label={message} rules={rules}>
          <Textbox
            name="input"
            defaultValue={defaultValue}
            placeholder={placeholder}
            styleType={["bordered"]}
            autoFocus
            data-test-id="prompt"
          />
        </Form.Item>
        <Form.Item style={{ margin: 0 }}>
          <Button
            className="mr-sm"
            type="primary"
            htmlType="submit"
            data-test-id="prompt-submit"
          >
            {actionText ?? "Submit"}
          </Button>
          <Button onClick={() => onCancel()}>Cancel</Button>
        </Form.Item>
      </Form>
    </Modal>
  ));
}

interface StudioElement {
  name: string;
}

interface UsageSummary {
  components?: Component[];
  frames?: ArenaFrame[];
  mixins?: Mixin[];
  tokens?: StyleToken[];
  themes?: DefaultStyle[];
  addItemPrefs?: AddItemKey[];
}

export async function deleteStudioElementConfirm(
  title: string,
  usages: {
    element: StudioElement;
    summary: UsageSummary;
  }[],
  message?: React.ReactNode
) {
  return await reactConfirm({
    title,
    message: (
      <>
        {usages.map(({ element, summary }) => (
          <p>
            <strong>{element.name}</strong> is still being used in:
            <ul>
              {makeUsageControl(
                "Components",
                summary.components?.map(getComponentDisplayName)
              )}
              {makeUsageControl(
                FRAMES_CAP,
                summary.frames?.map(
                  (frame) => frame.name || `unnamed ${FRAME_LOWER}`
                )
              )}
              {makeUsageControl(
                MIXINS_CAP,
                summary.mixins?.map((m) => m.name)
              )}
              {makeUsageControl(
                "Tokens",
                summary.tokens?.map((t) => t.name)
              )}
              {makeUsageControl(
                "Default Typography Styles",
                summary.themes?.map((t) => t.style.name)
              )}
              {makeUsageControl("Initial Styles", summary.addItemPrefs)}
            </ul>
          </p>
        ))}
        {message}
      </>
    ),
  });
}

const makeUsageControl = (usageName: string, names?: Array<string>) => {
  if (names === undefined || names.length === 0) {
    return null;
  }
  return (
    <li key={usageName}>
      {usageName}:{" "}
      <span className="asset-usage-items">
        {joinReactNodes(
          names.map((name, i) => <code key={i}>{name}</code>),
          ", "
        )}
      </span>
    </li>
  );
};
