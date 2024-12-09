import Button from "@/wab/client/components/widgets/Button";
import { Modal } from "@/wab/client/components/widgets/Modal";
import { defaultComponentKinds } from "@/wab/shared/core/components";
import { naturalSort } from "@/wab/shared/sort";
import { Form, Select } from "antd";
import React from "react";

export function DefaultComponentKindModal<T>({
  onSubmit,
  onCancel,
}: {
  onSubmit: (val: T) => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      title={<h3>Set as default component</h3>}
      visible
      footer={null}
      onCancel={() => onCancel()}
    >
      <Form
        labelCol={{
          span: 3,
        }}
        onFinish={(values) => {
          onSubmit(values.kind);
        }}
      >
        <Form.Item
          name="kind"
          label="Kind"
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Select placeholder="Set as the default component for this category">
            {naturalSort(
              Object.entries(defaultComponentKinds),
              ([_kind, label]) => label
            ).map(([kind, label]) => (
              <Select.Option value={kind}>{label}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          wrapperCol={{
            xs: {
              span: 24,
            },
            sm: {
              span: 8,
              offset: 8,
            },
          }}
        >
          <Button htmlType={"submit"} size={"stretch"} type={"primary"}>
            Submit
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
