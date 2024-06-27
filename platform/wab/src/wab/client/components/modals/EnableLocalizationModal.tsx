import { AppCtx } from "@/wab/client/app-ctx";
import { U } from "@/wab/client/cli-routes";
import {
  promptBilling,
  showUpsellConfirm,
} from "@/wab/client/components/modals/PricingModal";
import Button from "@/wab/client/components/widgets/Button";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { useTopFrameCtx } from "@/wab/client/frame-ctx/top-frame-ctx";
import { ApiProject } from "@/wab/shared/ApiSchema";
import { ORGANIZATION_LOWER } from "@/wab/shared/Labels";
import { notification } from "antd";
import { observer } from "mobx-react";
import React from "react";
import { FocusScope } from "react-aria";
import { Modal } from "@/wab/client/components/widgets/Modal";

export interface EnableLocalizationModalProps {
  onDone: () => void;
  isLocalizationEnabled: boolean;
  project: ApiProject;
}

export const EnableLocalizationModal = observer(
  function EnableLocalizationModal({
    isLocalizationEnabled,
    project,
    onDone,
  }: EnableLocalizationModalProps) {
    const appCtx = useAppCtx();
    const { hostFrameApi } = useTopFrameCtx();

    return (
      <Modal
        title={`${
          isLocalizationEnabled ? "Disable" : "Enable"
        } localization for this project?`}
        open
        onCancel={() => onDone()}
        footer={null}
      >
        <FocusScope contain>
          This lets you integrate with localization frameworks like Lingui,
          react-intl, and react-i18next by generating code that applies the
          localization framework to all localizable strings in the project.{" "}
          <br /> <br />
          <a
            href="https://docs.plasmic.app/learn/localization-frameworks/"
            target="_blank"
          >
            Learn about use with localization frameworks.
          </a>
          <div className="mt-xlg">
            <Button
              className="mr-sm"
              type="primary"
              onClick={async () => {
                if (
                  isLocalizationEnabled ||
                  (await canEnableLocalization(appCtx, project))
                ) {
                  await hostFrameApi.updateLocalizationProjectFlag(
                    !isLocalizationEnabled
                  );
                }
                onDone();
              }}
              autoFocus
            >
              Confirm
            </Button>
            <Button onClick={() => onDone()}>Cancel</Button>
          </div>
        </FocusScope>
      </Modal>
    );
  }
);

async function canEnableLocalization(appCtx: AppCtx, project: ApiProject) {
  const projectTeam = appCtx.teams.find((team) => team.id === project.teamId);
  if (!projectTeam) {
    notification.error({
      message: `This action requires an ${ORGANIZATION_LOWER}`,
    });
    return false;
  }
  if (projectTeam.featureTier?.localization) {
    return true;
  }

  const tiers = (await appCtx.api.listCurrentFeatureTiers()).tiers;
  const promptResult = await promptBilling({
    appCtx,
    availableTiers: tiers.filter((tier) => tier.localization),
    target: {
      team: projectTeam,
      initialTier: tiers.find((tier) => tier.id === projectTeam.featureTierId),
    },
    title: "Upgrade to perform this action",
    description: "Select a new plan to upgrade.",
  });
  if (!promptResult) {
    // User canceled
    return false;
  } else if (promptResult.type === "fail") {
    // Show errors
    notification.warn({
      message: `Issue with payment, please try again.`,
      description: promptResult.errorMsg,
    });
    return false;
  }

  await showUpsellConfirm(U.orgSettings({ teamId: projectTeam.id }));
  return true;
}
