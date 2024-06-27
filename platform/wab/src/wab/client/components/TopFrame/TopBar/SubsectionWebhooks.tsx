import { AppCtx } from "@/wab/client/app-ctx";
import { VisibleEnableBlock } from "@/wab/client/components/TopFrame/TopBar/PublishFlowDialog";
import { PublishState } from "@/wab/client/components/TopFrame/TopBar/PublishFlowDialogWrapper";
import { replaceLink } from "@/wab/client/components/view-common";
import { TriggeredWebhook } from "@/wab/client/components/webhooks/WebhookEvent";
import WebhooksItem, {
  ToggleWebhook,
} from "@/wab/client/components/webhooks/WebhooksItem";
import {
  AsyncState,
  useAsyncFnStrict,
} from "@/wab/client/hooks/useAsyncStrict";
import {
  DefaultSubsectionWebhooksProps,
  PlasmicSubsectionWebhooks,
} from "@/wab/client/plasmic/plasmic_kit_continuous_deployment/PlasmicSubsectionWebhooks";
import { spawn } from "@/wab/shared/common";
import {
  ApiProject,
  ApiProjectWebhook,
  ProjectWebhookEventsResponse,
} from "@/wab/shared/ApiSchema";
import * as React from "react";

export type SetupWebhooks = {
  webhooks: ToggleWebhook[];
  resetWebhookEnabled: () => void;
  updateWebhooks: (webhooks: ApiProjectWebhook[]) => void;
  updateWebhook: (webhook: ToggleWebhook) => void;
};

export type StatusWebhooks = {
  enabled: boolean;
  enabledWebhooks: TriggeredWebhook[];
};

export function mkWebhooksPublishState(
  status: StatusWebhooks | undefined
): PublishState {
  if (!status?.enabled) {
    return undefined;
  }

  if (status.enabledWebhooks.filter((w) => !w.event).length > 0) {
    return "publishing";
  }

  if (
    status.enabledWebhooks.filter((w) => w.event && w.event.status >= 400)
      .length > 0
  ) {
    return "failure";
  }

  return "success";
}

interface SubsectionWebhooksProps
  extends DefaultSubsectionWebhooksProps,
    VisibleEnableBlock {
  appCtx: AppCtx;
  project: ApiProject;
  fetchWebhooks: () => void;
  webhookEventState: AsyncState<ProjectWebhookEventsResponse>;
  onViewHistory: () => void;
  setup: SetupWebhooks;
  status?: StatusWebhooks;
  setShowCodeModal: (val: boolean) => Promise<void>;
}

function SubsectionWebhooks(props: SubsectionWebhooksProps) {
  const {
    appCtx,
    project,
    visible,
    enable,
    block,
    setVisibleEnableBlock,
    fetchWebhooks,
    webhookEventState,
    onViewHistory,
    setup,
    status,
    setShowCodeModal,
    ...rest
  } = props;
  const { webhooks, updateWebhook } = setup;
  const projectId = project.id;

  React.useEffect(() => {
    if (props.view !== "status") {
      fetchWebhooks();
    }
  }, [props.view]);

  const createProjectWebhook = useAsyncFnStrict(async () => {
    await appCtx.api.createProjectWebhook(projectId);
    fetchWebhooks();
  })[1];

  const deleteProjectWebhook = useAsyncFnStrict(
    async (webhook: ToggleWebhook) => {
      await appCtx.api.deleteProjectWebhook(projectId, webhook.id);
      fetchWebhooks();
    }
  )[1];

  const setWebhook = (webhook: ToggleWebhook) => {
    updateWebhook(webhook);
    spawn(
      (async () => {
        await appCtx.api.updateProjectWebhook(projectId, webhook);
      })()
    );
  };

  if (props.view === "status" && !status?.enabled) {
    return null;
  }

  function showCode() {
    spawn(setShowCodeModal(true));
  }

  return (
    <PlasmicSubsectionWebhooks
      {...rest}
      checkbox={{
        props: {
          "aria-label": "Enable webhooks",
          isDisabled: block,
          isChecked: enable,
          onChange: (checked: boolean) =>
            setVisibleEnableBlock(visible, checked, block),
        },
      }}
      collapse={props.view !== "status" && !visible}
      removeButton={{
        wrap: (node) => block && node,
        props: {
          onClick: () => setVisibleEnableBlock(false, false, block),
        },
      }}
      learnMoreLink={{
        target: "_blank",
      }}
      viewHistoryButton={{
        onClick: onViewHistory,
      }}
      addButton={{
        props: {
          onClick: () => {
            spawn(createProjectWebhook());
          },
        },
      }}
      history={{
        props: {
          webhooks: status?.enabledWebhooks,
        },
      }}
      description={{
        render: (_props) =>
          replaceLink(_props, (text) => (
            <a href="javascript: void 0" onClick={showCode}>
              {text}
            </a>
          )),
      }}
    >
      {webhooks.map((webhook) => (
        <WebhooksItem
          key={webhook.id}
          webhook={webhook}
          enabled={webhook.enable}
          setEnabled={(e: boolean) => {
            const w = { ...webhook };
            w.enable = e;
            updateWebhook(w);
          }}
          setWebhook={setWebhook}
          onRemove={() => {
            spawn(deleteProjectWebhook(webhook));
          }}
        />
      ))}
    </PlasmicSubsectionWebhooks>
  );
}

export default SubsectionWebhooks;
