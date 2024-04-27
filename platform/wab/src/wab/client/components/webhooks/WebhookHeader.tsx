import {
  DefaultWebhookHeaderProps,
  PlasmicWebhookHeader,
} from "@/wab/client/components/webhooks/plasmic/plasmic_kit_continuous_deployment/PlasmicWebhookHeader";
import * as React from "react";

interface WebhookHeaderProps extends DefaultWebhookHeaderProps {
  index: number;
  headerKey: string;
  headerValue: string;
  onChange: (index: number, key: string, value: string) => void;
  onAdd?: () => void;
  onRemove?: (index: number) => void;
}

function WebhookHeader(props: WebhookHeaderProps) {
  const { index, headerKey, headerValue, onChange, onAdd, onRemove, ...rest } =
    props;
  return (
    <PlasmicWebhookHeader
      {...rest}
      keyInput={{
        "aria-label": "Key",
        value: headerKey,
        onChange: (e) => {
          onChange(index, e.target.value, headerValue);
        },
      }}
      valueInput={{
        "aria-label": "Value",
        value: headerValue,
        onChange: (e) => {
          onChange(index, headerKey, e.target.value);
        },
      }}
      addButton={{
        onClick: () => onAdd && onAdd(),
        tooltip: "New header",
      }}
      deleteButton={{
        onClick: () => onRemove && onRemove(index),
        tooltip: "Delete header",
      }}
    />
  );
}

export default WebhookHeader;
