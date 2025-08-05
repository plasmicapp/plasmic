import { isPlasmicPath } from "@/wab/client/cli-routes";
import { maybeShowPaywall } from "@/wab/client/components/modals/PricingModal";
import "@/wab/client/components/pages/AuthForm.sass";
import { PageFooter } from "@/wab/client/components/pages/PageFooter";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { getTeamInviteLink } from "@/wab/client/components/widgets/plasmic/ShareDialogContent";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import MarkFullColorIcon from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__MarkFullColor";
import { ApiTeam, Grant } from "@/wab/shared/ApiSchema";
import { ensure, isValidEmail, spawn } from "@/wab/shared/common";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { fillRoute } from "@/wab/shared/route/route";
import { Button, Form, Input, notification, Select, Tooltip } from "antd";
import copy from "copy-to-clipboard";
import * as React from "react";
import { ReactNode, useState } from "react";

function Label({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: "13px" }}>{children}</div>;
}

export function TeamCreation() {
  const appCtx = useAppCtx();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [team, setTeam] = useState<ApiTeam | undefined>(undefined);
  const continueToPath = new URLSearchParams(location.search).get("continueTo");
  const nextPath =
    continueToPath && isPlasmicPath(continueToPath)
      ? continueToPath
      : team
      ? fillRoute(APP_ROUTES.org, { teamId: team.id })
      : fillRoute(APP_ROUTES.dashboard, {});
  const [form] = Form.useForm();

  async function onSubmit({ teamName }) {
    setSubmitting(true);
    try {
      if (!teamName) {
        notification.error({
          message: "Insert your organization name to create an organization",
        });
        setSubmitting(false);
        return;
      }
      const response = await appCtx.api.createTeam(teamName);
      setTeam(response.team);
      await appCtx.reloadAll();
    } finally {
      setSubmitting(false);
    }
  }

  async function onInvites({ inviteEmails }) {
    setSubmitting(true);
    try {
      const emails = inviteEmails
        ? (inviteEmails as string[])
            .map((email) => email.trim())
            .filter((email) => !!email)
        : [];
      if (emails.some((email) => !isValidEmail(email))) {
        notification.error({
          message: "Enter valid emails only, comma separated... ",
        });
        setSubmitting(false);
        return;
      }

      const grants: Grant[] = emails.map((email) => ({
        email,
        accessLevel: "editor",
        teamId: ensure(team, "Organization must exist to invite").id,
      }));
      if (grants) {
        await maybeShowPaywall(
          appCtx,
          async () =>
            await appCtx.api.grantRevoke({
              grants,
              revokes: [],
            }),
          {
            title: "Upgrade to grant new permissions",
            description:
              "This organization does not have enough seats to grant permissions to new users. Please increase the number of seats to be able to perform this action.",
          }
        );
      }
      appCtx.router.routeTo(nextPath.toString());
    } finally {
      setSubmitting(false);
    }
  }

  async function onSkip() {
    setSubmitting(true);
    try {
      await appCtx.api.updateSelfInfo({
        needsTeamCreationPrompt: false,
      });
      await appCtx.reloadAll();
      appCtx.router.routeTo(nextPath.toString());
    } finally {
      setSubmitting(false);
    }
  }
  React.useEffect(() => {
    if (nextPath.includes("?inviteId=") || !appCtx.appConfig.createTeamPrompt) {
      spawn(onSkip());
    }
  }, [nextPath, appCtx]);

  return (
    <div className={"LoginForm__Container"}>
      <div className={"LoginForm__Content"}>
        <div className={"LoginForm__Logo"}>
          <Tooltip title="Plasmic">
            <Icon icon={MarkFullColorIcon} style={{ width: 128, height: 64 }} />
          </Tooltip>
        </div>
        <div className={"LoginForm__Controls"}>
          {!team && (
            <Form
              form={form}
              layout={"vertical"}
              onFinish={onSubmit}
              className={"SurveyForm__Fields"}
            >
              <h2>Welcome to Plasmic!</h2>
              <Form.Item
                label={<Label>Tell us about your organization</Label>}
                name={"teamName"}
              >
                <Input size={"large"} placeholder={`Organization name...`} />
              </Form.Item>
              <Button
                loading={submitting}
                htmlType={"submit"}
                type={"primary"}
                size={"large"}
              >
                Name this organization
              </Button>
            </Form>
          )}
          {team && (
            <Form
              form={form}
              layout={"vertical"}
              onFinish={onInvites}
              className={"SurveyForm__Fields"}
            >
              <h2>Invite your collaborators</h2>
              <Label>Share organization files and create together</Label>
              <Button
                htmlType={"button"}
                size={"large"}
                onClick={() => copy(getTeamInviteLink(team))}
              >
                Copy invite link
              </Button>
              <Form.Item name={"inviteEmails"}>
                <Select
                  mode="tags"
                  data-test-id={"invite-emails"}
                  size={"large"}
                  placeholder={`Or invite by email, comma separated...`}
                />
              </Form.Item>
              <Button
                loading={submitting}
                htmlType={"submit"}
                type={"primary"}
                size={"large"}
              >
                Send invites
              </Button>
              <Button htmlType={"button"} size={"large"} onClick={onSkip}>
                Do this later
              </Button>
            </Form>
          )}
        </div>
        <PageFooter />
      </div>
    </div>
  );
}
