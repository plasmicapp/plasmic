import { Component } from "@/wab/classes";
import { showTemporaryPrompt } from "@/wab/client/components/quick-modals";
import Button from "@/wab/client/components/widgets/Button";
import Textbox from "@/wab/client/components/widgets/Textbox";
import { Form } from "antd";
import React from "react";
import { Modal } from "src/wab/client/components/widgets/Modal";

export default async function promptForMetadata(
  component: Component
): Promise<{ key: string; value: string } | undefined> {
  type KeyValuePair = { key: string; value: string };
  const keyAndValue = await showTemporaryPrompt<KeyValuePair | undefined>(
    (onSubmit, onCancel) => (
      <Modal
        title={null}
        visible={true}
        footer={null}
        onCancel={onCancel}
        closable={false}
        wrapClassName="prompt-modal"
      >
        <Form
          onFinish={(e) => {
            onSubmit({
              key: e.keyInput,
              value: e.valueInput,
            });
          }}
          data-test-id="prompt-form"
          layout="vertical"
        >
          <Form.Item
            name="keyInput"
            label={`Key for a new metadata for "${component.name}":`}
          >
            <Textbox
              name="keyInput"
              placeholder="Metadata key"
              styleType={["bordered"]}
              autoFocus
              data-test-id="prompt"
            />
          </Form.Item>
          <Form.Item
            name="valueInput"
            label={`Value for a new metadata for "${component.name}":`}
          >
            <Textbox
              name="valueInput"
              placeholder="Metadata value"
              styleType={["bordered"]}
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
              Confirm
            </Button>
            <Button onClick={() => onCancel()}>Cancel</Button>
          </Form.Item>
        </Form>
      </Modal>
    )
  );

  if (!keyAndValue || !keyAndValue?.key || !keyAndValue?.value) {
    return undefined;
  }
  keyAndValue.key = keyAndValue.key.trim();
  keyAndValue.value = keyAndValue.value.trim();
  console.log(keyAndValue.key, keyAndValue.value);
  return { key: keyAndValue.key, value: keyAndValue.value };
}
