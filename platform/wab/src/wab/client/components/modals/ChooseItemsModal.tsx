import { showTemporaryPrompt } from "@/wab/client/components/quick-modals";
import Button from "@/wab/client/components/widgets/Button";
import { Modal } from "@/wab/client/components/widgets/Modal";
import { Checkbox, Form, Row } from "antd";
import { CheckboxValueType } from "antd/lib/checkbox/Group";
import * as React from "react";

export interface ItemData<T> {
  value: string;
  item: T;
  label?: string;
  disabled?: boolean;
  defaultChecked?: boolean;
}

/**
 * Given a group of items, display a modal overlay that asks the user to choose
 * one. The promise will either return the chosen item or undefined
 * @param props
 * @returns
 */
export async function promptChooseItems<T>(props: {
  title: string;
  description?: string;
  group: ItemData<T>[];
}): Promise<ItemData<T>[] | undefined> {
  return showTemporaryPrompt<ItemData<T>[] | undefined>(
    (onSubmit, onCancel) => (
      <ChooseItemsForm
        title={props.title}
        description={props.description}
        group={props.group}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    )
  );
}

function ChooseItemsForm<T>(props: {
  title: string;
  description?: string;
  group: ItemData<T>[];
  onSubmit: (data: ItemData<T>[]) => void;
  onCancel: () => void;
}) {
  const { title, description, group, onSubmit, onCancel } = props;
  const [chosen, setChosen] = React.useState<CheckboxValueType[]>([]);
  const handleSubmit = React.useCallback(() => {
    onSubmit(group.filter((i) => chosen?.includes(i.value)));
  }, [onSubmit, group, chosen]);

  return (
    <Modal
      title={title}
      visible={true}
      footer={null}
      maskClosable={false}
      onCancel={() => onCancel()}
    >
      {description && <p>{description}</p>}
      <Form onFinish={handleSubmit}>
        <Form.Item required>
          <Checkbox.Group
            onChange={setChosen}
            defaultValue={group
              .filter(({ defaultChecked }) => defaultChecked)
              .map(({ value }) => value)}
          >
            {group.map(({ disabled, value, label }) => (
              <Row key={value}>
                <Checkbox disabled={disabled} value={value}>
                  {label ?? value}
                </Checkbox>
              </Row>
            ))}
          </Checkbox.Group>
        </Form.Item>
        <Form.Item>
          <Button className="mr-sm" type="primary" htmlType="submit">
            Confirm
          </Button>
          <Button onClick={() => onCancel()}>Cancel</Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
