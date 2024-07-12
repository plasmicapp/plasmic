import {
  DefaultWebhookEventProps,
  PlasmicWebhookEvent,
} from "@/wab/client/components/webhooks/plasmic/plasmic_kit_continuous_deployment/PlasmicWebhookEvent";
import PublishSpinner from "@/wab/client/components/widgets/PublishSpinner";
import {
  ApiProjectWebhook,
  ApiProjectWebhookEvent,
} from "@/wab/shared/ApiSchema";
import * as React from "react";

export type TriggeredWebhook = ApiProjectWebhook & {
  event?: ApiProjectWebhookEvent;
};

interface WebhookEventProps extends DefaultWebhookEventProps {
  event?: ApiProjectWebhookEvent;
  webhook?: TriggeredWebhook;
}

function WebhookEvent(props: WebhookEventProps) {
  const { event, webhook, ...rest } = props;
  const [expanded, setExpanded] = React.useState(false);

  return (
    <PlasmicWebhookEvent
      {...rest}
      expanded={expanded}
      viewButton={{
        props: {
          onClick: () => {
            setExpanded(!expanded);
          },
        },
      }}
      {...(event
        ? {
            method: event.method,
            url: event.url,
            status: `${event.status}`,
            createdAt: event.createdAt.toString(),
            response: event.response,
            state: event.status >= 300 ? "failed" : undefined,
          }
        : webhook
        ? {
            method: webhook.method,
            url: webhook.url,
            indicator: !webhook.event
              ? {
                  render: () => <PublishSpinner />,
                }
              : undefined,
            status: `${webhook.event?.status}`,
            createdAt: webhook.event?.createdAt.toString(),
            response: webhook.event?.response,
            state: !webhook.event
              ? "loading"
              : webhook.event.status >= 300
              ? "failed"
              : undefined,
          }
        : {})}
    />
  );
}

export default WebhookEvent;
