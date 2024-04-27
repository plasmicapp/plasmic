import { useNonAuthCtx } from "@/wab/client/app-ctx";
import { isPlasmicPath, U } from "@/wab/client/cli-routes";
import "@/wab/client/components/pages/AuthForm.sass";
import { LinkButton } from "@/wab/client/components/widgets";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import MarkFullColorIcon from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__MarkFullColor";
import { spawn } from "@/wab/common";
import { ApiUser, ConfirmEmailResponse } from "@/wab/shared/ApiSchema";
import { Button, notification, Spin, Tooltip } from "antd";
import * as React from "react";

interface EmailVerificationProps {
  selfInfo: ApiUser;
}

export function useEmailVerification(selfInfo: ApiUser) {
  const appCtx = useAppCtx();
  const nonAuthCtx = useNonAuthCtx();

  const continueToPath = new URLSearchParams(location.search).get("continueTo");
  const nextPath =
    continueToPath && isPlasmicPath(continueToPath)
      ? continueToPath
      : U.orgCreation({});

  const token = new URL(location.href).searchParams.get("token") ?? "";

  const [mode, setMode] = React.useState<string>(
    token ? "loading" : "email-sent"
  );

  React.useEffect(() => {
    if (token) {
      spawn(
        Promise.resolve(
          nonAuthCtx.api.confirmEmail({ email: selfInfo.email, token })
        ).then((response: ConfirmEmailResponse) => {
          setMode(response.status ? "valid-token" : "invalid-token");
        })
      );
    }
  }, [selfInfo.email, token, nonAuthCtx]);

  React.useEffect(() => {
    if (!selfInfo.waitingEmailVerification) {
      appCtx.router.routeTo(nextPath);
    }
  }, [selfInfo.email, selfInfo.waitingEmailVerification]);

  function showEmailSentNotification() {
    notification.info({
      message: `New email sent to ${selfInfo.email}"`,
      description: "Please verify your email address to start using Plasmic.",
    });
  }

  return {
    appCtx,
    nonAuthCtx,
    nextPath,
    mode,
    setMode,
    showEmailSentNotification,
  };
}

export function EmailVerification(props: EmailVerificationProps) {
  const { selfInfo } = props;
  const {
    appCtx,
    nonAuthCtx,
    nextPath,
    mode,
    setMode,
    showEmailSentNotification,
  } = useEmailVerification(selfInfo);

  return (
    <div className={"LoginForm__Container"}>
      <div className={"LoginForm__Content"}>
        <div className={"LoginForm__Logo"}>
          <Tooltip title="Plasmic">
            <Icon icon={MarkFullColorIcon} style={{ width: 128, height: 64 }} />
          </Tooltip>
        </div>
        <div className={"LoginForm__Controls"}>
          {mode === "valid-token" ? (
            <div>
              <h2>Thanks for verifying your email</h2>
              <p>
                Now we know it's you, you can start getting the best out of
                Plasmic.
              </p>
              <Button
                type={"primary"}
                size={"large"}
                block={true}
                onClick={async () => {
                  await appCtx.reloadAll();
                  appCtx.router.routeTo(nextPath);
                }}
              >
                Continue
              </Button>
            </div>
          ) : mode === "invalid-token" ? (
            <div>
              <h2>Verify your email address!</h2>
              <p>Sorry, something went wrong with that link</p>
              <p>
                <Button
                  type={"primary"}
                  size={"large"}
                  block={true}
                  onClick={async () => {
                    showEmailSentNotification();
                    await nonAuthCtx.api.sendEmailVerification({
                      email: selfInfo.email,
                      nextPath,
                    });
                    setMode("email-sent");
                  }}
                >
                  Resend email
                </Button>
              </p>
              <p>
                We'll send a new email to <strong>{selfInfo.email}</strong>
              </p>
              <p>
                Not you?{" "}
                <LinkButton onClick={async () => await appCtx.logout()}>
                  {" "}
                  Log out{" "}
                </LinkButton>{" "}
                to log in with a different email.
              </p>
            </div>
          ) : mode === "email-sent" ? (
            <div>
              <h2>Verify your email address!</h2>
              <p>
                To use Plasmic, click the verification link in the email we sent
                to <strong>{selfInfo.email}</strong>. This helps keep your
                account secure.
              </p>
              <p>
                No email in your inbox or spam folder? Let’s
                <LinkButton
                  onClick={async () => {
                    showEmailSentNotification();
                    if (!selfInfo.isFake) {
                      await nonAuthCtx.api.sendEmailVerification({
                        email: selfInfo.email,
                        nextPath,
                      });
                    } else {
                      await nonAuthCtx.api.forgotPassword({
                        email: selfInfo.email,
                      });
                    }
                  }}
                >
                  resend it.
                </LinkButton>
              </p>
              <p>
                Not you?{" "}
                <LinkButton onClick={async () => await appCtx.logout()}>
                  {" "}
                  Log out{" "}
                </LinkButton>{" "}
                to log in with a different email.
              </p>
            </div>
          ) : (
            <Spin size="large" tip="Verifying token..." />
          )}
        </div>
      </div>
    </div>
  );
}
