import { AppCtx } from "@/wab/client/app-ctx";
import { GithubConnect } from "@/wab/client/components/auth/GithubConnect";
import Button from "@/wab/client/components/widgets/Button";
import OpenIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Open";
import {
  DefaultPublishWizardProps,
  PlasmicPublishWizard,
} from "@/wab/client/plasmic/plasmic_kit_continuous_deployment/PlasmicPublishWizard";
import * as React from "react";

interface PublishWizardProps extends DefaultPublishWizardProps {
  appCtx: AppCtx;
  close: () => void;
  onGithubConnect: () => void;
}

function PublishWizard(props: PublishWizardProps) {
  const { appCtx, close, onGithubConnect, ...rest } = props;
  return (
    <PlasmicPublishWizard
      connectButton={{
        render: () => (
          <GithubConnect
            api={appCtx.api}
            type="oauth"
            onSuccess={onGithubConnect}
            render={(ps: { onClick: () => void; isWaiting: boolean }) => (
              <Button
                disabled={ps.isWaiting}
                onClick={ps.onClick}
                type="primary"
                size="small"
                endIcon={<OpenIcon />}
                withIcons="endIcon"
              >
                {ps.isWaiting ? "Waiting for GitHub..." : "Connect to GitHub"}
              </Button>
            )}
          />
        ),
      }}
      laterButton={{
        onClick: close,
      }}
      closeButton={{
        onClick: close,
      }}
      {...rest}
    />
  );
}

export default PublishWizard;
