import { Component, ComponentDataQuery, Param, Site } from "@/wab/classes";
import { showTemporaryPrompt } from "@/wab/client/components/quick-modals";
import Button from "@/wab/client/components/widgets/Button";
import Textbox from "@/wab/client/components/widgets/Textbox";
import { joinReactNodes } from "@/wab/commons/components/ReactUtil";
import { Form } from "antd";
import { computed } from "mobx";
import { useLocalStore, useObserver } from "mobx-react";
import React from "react";
import { Modal } from "src/wab/client/components/widgets/Modal";

export interface ExtractComponentResponse {
  name: string;
}

export async function promptExtractComponent(props: {
  site: Site;
  containingComponent: Component;
  linkedParams: Param[];
  queriesToCreateProps: ComponentDataQuery[];
}) {
  return showTemporaryPrompt<ExtractComponentResponse>((onSubmit, onCancel) => (
    <Modal
      title="Create new component"
      footer={null}
      visible={true}
      onCancel={() => onCancel()}
    >
      <ExtractComponentForm
        site={props.site}
        containingComponent={props.containingComponent}
        linkedParams={props.linkedParams}
        queriesToCreateProps={props.queriesToCreateProps}
        onSubmit={(resp) => onSubmit(resp)}
        onCancel={() => onCancel()}
      />
    </Modal>
  ));
}

export function ExtractComponentForm(props: {
  site: Site;
  containingComponent: Component;
  linkedParams: Param[];
  queriesToCreateProps: ComponentDataQuery[];
  onSubmit: (resp: ExtractComponentResponse) => void;
  onCancel: () => void;
}) {
  const { containingComponent, linkedParams, queriesToCreateProps } = props;

  const resp = useLocalStore<ExtractComponentResponse>(() => ({
    name: "",
    resurfaceParams: false,
  }));

  const validateName = (name: string) => {
    if (!name.trim()) {
      return undefined;
    }

    return undefined;
  };

  const errors = computed(() => ({
    name: validateName(resp.name),
  }));

  return useObserver(() => (
    <Form
      onFinish={(_e) => {
        if (resp.name && !errors.get().name) {
          props.onSubmit(resp);
        }
      }}
      layout="horizontal"
      data-test-id="extract-component-form"
    >
      <Form.Item
        label="Component name"
        validateStatus={errors.get().name ? "error" : undefined}
        help={errors.get().name}
      >
        <Textbox
          onChange={(e) => (resp.name = e.target.value)}
          value={resp.name}
          autoFocus={true}
          placeholder={"Enter the name of your new component"}
          data-test-id="extract-component-name"
          styleType={["bordered"]}
        />
      </Form.Item>
      {(linkedParams.length > 0 || queriesToCreateProps.length > 0) &&
        !!containingComponent.name && (
          <div className="mb-xlg">
            Your new component will also have props for{" "}
            {joinReactNodes(
              [
                ...linkedParams.map((s) => <code>{s.variable.name}</code>),
                ...queriesToCreateProps.map((q) => <code>{q.name}</code>),
              ],
              ", "
            )}
            .
          </div>
        )}
      <Form.Item>
        <Button
          className="mr-sm"
          type="primary"
          htmlType="submit"
          onClick={() => props.onSubmit(resp)}
          disabled={!resp.name || !!errors.get().name}
        >
          Create component
        </Button>
        <Button onClick={() => props.onCancel()}>Cancel</Button>
      </Form.Item>
    </Form>
  ));
}
