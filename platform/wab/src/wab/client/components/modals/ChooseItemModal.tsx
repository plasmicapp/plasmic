import { showTemporaryPrompt } from "@/wab/client/components/quick-modals";
import Button from "@/wab/client/components/widgets/Button";
import { Form, Radio } from "antd";
import * as React from "react";
import { Modal } from "@/wab/client/components/widgets/Modal";

export interface NamedItem<T> {
  name: string;
  item: T;
}

/**
 * Given a group of items, display a modal overlay that asks the user to choose
 * one. The promise will either return the chosen item or undefined
 * @param props
 * @returns
 */
export async function promptChooseItem<T>(props: {
  title: string;
  description?: string;
  group: NamedItem<T>[];
}): Promise<NamedItem<T> | undefined> {
  return showTemporaryPrompt<NamedItem<T> | undefined>((onSubmit, onCancel) => (
    <ChooseItemForm
      title={props.title}
      description={props.description}
      group={props.group}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  ));
}

function ChooseItemForm<T>(props: {
  title: string;
  description?: string;
  group: NamedItem<T>[];
  onSubmit: (data: NamedItem<T> | undefined) => void;
  onCancel: () => void;
}) {
  const { title, description, group, onSubmit, onCancel } = props;
  const [chosen, setChosen] = React.useState<NamedItem<T> | undefined>();
  const onChange = (e) => {
    setChosen(e.target.value);
  };
  const radioStyle = {
    display: "block",
    height: "30px",
    lineHeight: "30px",
  };

  return (
    <Modal
      title={title}
      visible={true}
      footer={null}
      onCancel={() => onCancel()}
    >
      {description && <p>{description}</p>}
      <Form onFinish={() => onSubmit(chosen)}>
        <Radio.Group onChange={onChange} value={chosen}>
          {group.map((i) => (
            <Radio style={radioStyle} value={i}>
              {i.name}
            </Radio>
          ))}
        </Radio.Group>
        <Form.Item>
          <Button
            className="mr-sm"
            type="primary"
            htmlType="submit"
            onClick={() => onSubmit(chosen)}
          >
            Confirm
          </Button>
          <Button onClick={() => onCancel()}>Cancel</Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
