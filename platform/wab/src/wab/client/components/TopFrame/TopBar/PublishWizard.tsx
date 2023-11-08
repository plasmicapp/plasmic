import * as React from "react";
import { AppCtx } from "../../../app-ctx";
import OpenIcon from "../../../plasmic/plasmic_kit/PlasmicIcon__Open";
import {
  DefaultPublishWizardProps,
  PlasmicPublishWizard,
} from "../../../plasmic/plasmic_kit_continuous_deployment/PlasmicPublishWizard";
import { GithubConnect } from "../../auth/GithubConnect";
import Button from "../../widgets/Button";

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
