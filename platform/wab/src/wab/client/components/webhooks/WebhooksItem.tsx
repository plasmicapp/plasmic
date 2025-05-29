import {
  DefaultWebhooksItemProps,
  PlasmicWebhooksItem,
} from "@/wab/client/components/webhooks/plasmic/plasmic_kit_continuous_deployment/PlasmicWebhooksItem";
import WebhookHeader from "@/wab/client/components/webhooks/WebhookHeader";
import styles from "@/wab/client/components/webhooks/WebhooksItem.module.scss";
import Select from "@/wab/client/components/widgets/Select";
import TrashIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Trash";
import PresetsIcon from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__Presets";
import { StandardMarkdown } from "@/wab/client/utils/StandardMarkdown";
import { ApiProjectWebhook } from "@/wab/shared/ApiSchema";
import { httpMethods } from "@/wab/shared/HttpClientUtil";
import { Menu, Popover } from "antd";
import { observer } from "mobx-react";
import * as React from "react";

export type ToggleWebhook = ApiProjectWebhook & { enable: boolean };

interface WebhooksItemProps extends DefaultWebhooksItemProps {
  webhook: ToggleWebhook;
  setWebhook: (webhook: ToggleWebhook) => void;
  enabled: boolean;
  setEnabled: (e: boolean) => void;
  onRemove: () => void;
}

const WebhooksItem = observer(function WebhooksItem(props: WebhooksItemProps) {
  const { webhook, setWebhook, enabled, setEnabled, onRemove, ...rest } = props;

  const [expanded, setExpanded] = React.useState(false);
  React.useEffect(() => {
    if (webhook.headers?.length || webhook.payload) {
      setExpanded(true);
    }
  }, []);

  const onAddHeader = () => {
    const w = { ...webhook };
    w.headers = [{ key: "", value: "" }, ...(webhook.headers ?? [])];
    setWebhook(w);
  };
  const onChangeHeader = (i: number, key: string, value: string) => {
    const w = { ...webhook };
    if (i === -1) {
      w.headers = [{ key, value }, ...(webhook.headers ?? [])];
    } else {
      w.headers = [...(webhook.headers ?? [])];
      w.headers[i] = { key, value };
    }
    setWebhook(w);
  };
  const onRemoveHeader = (i: number) => {
    const w = { ...webhook };
    w.headers = [...(webhook.headers ?? [])];
    w.headers.splice(i, 1);
    setWebhook(w);
  };
  const headers = (webhook.headers ?? []).map(({ key, value }, i) => (
    <WebhookHeader
      key={i}
      index={i}
      showAdd={i === 0 && key !== ""}
      headerKey={key}
      headerValue={value}
      onChange={onChangeHeader}
      onAdd={onAddHeader}
      onRemove={onRemoveHeader}
    />
  ));
  if (headers.length === 0) {
    headers.push(
      <WebhookHeader
        key={0}
        index={-1}
        hideDelete={true}
        headerKey=""
        headerValue=""
        onChange={onChangeHeader}
      />
    );
  }

  return (
    <>
      <PlasmicWebhooksItem
        checkbox={{
          props: {
            "aria-label": "Enable webhook",
            isChecked: enabled,
            onChange: (checked: boolean) => setEnabled(checked),
          },
        }}
        method={{
          "aria-label": "Method",
          value: webhook.method,
          onChange: (key) => {
            const w = { ...webhook };
            w.method = key as string;
            setWebhook(w);
          },
          children: httpMethods.map((m) => (
            <Select.Option value={m} key={m}>
              {m}
            </Select.Option>
          )),
        }}
        url={{
          "aria-label": "URL",
          value: webhook.url,
          onChange: (e) => {
            const w = { ...webhook };
            w.url = e.target.value;
            setWebhook(w);
          },
        }}
        menuButton={{
          menu: () => (
            <Menu>
              <Menu.Item
                className={styles.item}
                onClick={() => setExpanded(!expanded)}
              >
                <PresetsIcon />
                {expanded ? "Hide advanced options" : "Advanced options..."}
              </Menu.Item>
              <Menu.Item
                className={`${styles.item} ${styles.delete}`}
                onClick={() => {
                  // This setTimeout avoids a React warning that is triggered
                  // by removing the webhook before closing the menu.
                  setTimeout(onRemove, 0);
                }}
              >
                <TrashIcon />
                Delete webhook
              </Menu.Item>
            </Menu>
          ),
        }}
        expanded={expanded}
        headers={headers}
        payload={{
          "aria-label": "Payload",
          value: webhook.payload,
          onChange: (e) => {
            const w = { ...webhook };
            w.payload = e.target.value;
            setWebhook(w);
          },
        }}
        sendPlasmicDataSwitch={{
          "aria-label": "Send Plasmic data",
          isChecked: webhook.includeChangeData ?? false,
          onChange: (val) => {
            const w = { ...webhook };
            w.includeChangeData = val;
            setWebhook(w);
          },
        }}
        sendDataInfo={{
          wrap: (node) => (
            <Popover
              trigger={["hover", "click"]}
              mouseEnterDelay={0.3}
              overlayStyle={{ zIndex: 1080 }}
              content={
                <StandardMarkdown>
                  {`
Whether to send information about the changes in the project.

[Learn more in the docs](https://docs.plasmic.app/learn/webhooks/).
                  `}
                </StandardMarkdown>
              }
            >
              {node}
            </Popover>
          ),
        }}
        {...rest}
      />
    </>
  );
});

export default WebhooksItem;
