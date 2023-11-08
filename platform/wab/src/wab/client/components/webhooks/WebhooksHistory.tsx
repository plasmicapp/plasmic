import * as React from "react";
import {
  ApiProjectWebhookEvent,
  ProjectWebhookEventsResponse,
} from "../../../shared/ApiSchema";
import { AsyncState } from "../../hooks/useAsyncStrict";
import {
  DefaultWebhooksHistoryProps,
  PlasmicWebhooksHistory,
} from "./plasmic/plasmic_kit_continuous_deployment/PlasmicWebhooksHistory";
import WebhookEvent, { TriggeredWebhook } from "./WebhookEvent";

interface WebhooksHistoryProps extends DefaultWebhooksHistoryProps {
  state?: AsyncState<ProjectWebhookEventsResponse | undefined>;
  webhooks?: TriggeredWebhook[];
}

function WebhooksHistory(props: WebhooksHistoryProps) {
  const { state, webhooks, ...rest } = props;

  if (webhooks) {
    return (
      <PlasmicWebhooksHistory
        {...rest}
        loading={false}
        events={
          webhooks.map((w: TriggeredWebhook) => (
            <WebhookEvent key={w.id} webhook={w} />
          )) || []
        }
      />
    );
  }

  return (
    <PlasmicWebhooksHistory
      {...rest}
      loading={!state || state.loading || state.error ? true : false}
      events={
        state?.value?.events.map((event: ApiProjectWebhookEvent) => (
          <WebhookEvent key={event.id} event={event} />
        )) || []
      }
    />
  );
}

export default WebhooksHistory;
