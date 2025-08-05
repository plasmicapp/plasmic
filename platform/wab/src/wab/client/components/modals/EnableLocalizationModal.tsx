import { AppCtx } from "@/wab/client/app-ctx";
import {
  promptBilling,
  showUpsellConfirm,
} from "@/wab/client/components/modals/PricingModal";
import Button from "@/wab/client/components/widgets/Button";
import { Modal } from "@/wab/client/components/widgets/Modal";
import Select from "@/wab/client/components/widgets/Select";
import Textbox from "@/wab/client/components/widgets/Textbox";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { useTopFrameCtx } from "@/wab/client/frame-ctx/top-frame-ctx";
import { ApiProject } from "@/wab/shared/ApiSchema";
import { ORGANIZATION_LOWER } from "@/wab/shared/Labels";
import { LocalizationConfig } from "@/wab/shared/localization";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { fillRoute } from "@/wab/shared/route/route";
import { Form, notification } from "antd";
import { observer } from "mobx-react";
import React from "react";
import { FocusScope } from "react-aria";

export interface EnableLocalizationModalProps {
  onDone: () => void;
  isLocalizationEnabled: boolean;
  localizationScheme?: LocalizationConfig;
  project: ApiProject;
}

export const EnableLocalizationModal = observer(
  function EnableLocalizationModal({
    isLocalizationEnabled,
    localizationScheme,
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
          <div className="mb-xlg">
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
          </div>
          <Form
            onFinish={async (e) => {
              if (
                isLocalizationEnabled ||
                (await canEnableLocalization(appCtx, project))
              ) {
                await hostFrameApi.updateLocalizationProjectFlags(
                  !isLocalizationEnabled,
                  e.keyScheme,
                  e.tagPrefix
                );
              }
              onDone();
            }}
          >
            {!isLocalizationEnabled && (
              <>
                <Form.Item label="Key scheme" name="keyScheme">
                  <Select
                    defaultValue={localizationScheme?.keyScheme}
                    placeholder="Set the key scheme to be used in preview"
                    type="bordered"
                  >
                    <Select.Option value="path">Path</Select.Option>
                    <Select.Option value="content">Content</Select.Option>
                    <Select.Option value="hash">Hash</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label="Tag prefix" name="tagPrefix">
                  <Textbox
                    defaultValue={localizationScheme?.tagPrefix}
                    placeholder="Set the tag prefix to be used in preview"
                    styleType={["bordered"]}
                  />
                </Form.Item>
              </>
            )}
            <Form.Item>
              <Button
                htmlType="submit"
                className="mr-sm"
                type="primary"
                autoFocus
              >
                Confirm
              </Button>
              <Button onClick={() => onDone()}>Cancel</Button>
            </Form.Item>
          </Form>
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

  await showUpsellConfirm(
    fillRoute(APP_ROUTES.orgSettings, { teamId: projectTeam.id })
  );
  return true;
}
