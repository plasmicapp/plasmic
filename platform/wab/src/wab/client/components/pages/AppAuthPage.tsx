import { useNonAuthCtx } from "@/wab/client/app-ctx";
import { U } from "@/wab/client/cli-routes";
import { useAppAuthPubConfig } from "@/wab/client/components/app-auth/app-auth-contexts";
import { GoogleSignInButton } from "@/wab/client/components/auth/ConnectOAuth";
import {
  Feedback,
  FormFeedback,
  useAuthForm,
} from "@/wab/client/components/pages/AuthForm";
import { useEmailVerification } from "@/wab/client/components/pages/EmailVerification";
import { IntakeFlowForm } from "@/wab/client/components/pages/IntakeFlowForm";
import { LinkButton, Spinner } from "@/wab/client/components/widgets";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import MarkFullColorIcon from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__MarkFullColor";
import { trackEvent } from "@/wab/client/tracking";
import { ApiUser } from "@/wab/shared/ApiSchema";
import { getPublicUrl } from "@/wab/urls";
import { Button, Divider, Input, notification, Spin, Tooltip } from "antd";
import $ from "jquery";
import React from "react";
import { useLocation } from "react-router";
const LazyPasswordStrengthBar = React.lazy(
  () => import("@/wab/client/components/PasswordStrengthBar")
);

type AuthorizationPageModes =
  | "sign in"
  | "sign up"
  | "forgot password"
  | "email verification"
  | "reset password";

export function AppAuthPage() {
  const appCtx = useAppCtx();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const clientId = params.get("client_id"); // client_id = appId
  const state = params.get("state");
  const responseType = params.get("response_type");
  const codeChallenge = params.get("code_challenge");
  const codeChallengeMethod = params.get("code_challenge_method");

  function requestRedirect() {
    const url = new URL(`${getPublicUrl()}/api/v1/app-auth/code`);
    const redirectParams = new URLSearchParams(location.search);
    for (const [key, value] of redirectParams) {
      url.searchParams.set(key, value);
    }
    window.location.replace(url.toString());
  }

  // pub config should have information about what to show in this page
  const userEmail = appCtx.selfInfo?.email;
  const { config, loading } = useAppAuthPubConfig(
    appCtx,
    clientId ?? "",
    userEmail
  );

  const changeModeAndNavigate = (mode: AuthorizationPageModes) => {
    const newParams = new URLSearchParams(location.search);
    newParams.set("mode", mode);
    // delete fields from password reset / email verification every navigation
    newParams.delete("email");
    newParams.delete("token");
    appCtx.router.routeTo(location.pathname + "?" + newParams.toString());
  };

  const getCurrentPath = () => {
    const newParams = new URLSearchParams(window.location.search);
    newParams.delete("mode");
    newParams.delete("token");
    newParams.delete("email");
    return (
      window.location.origin +
      window.location.pathname +
      "?" +
      newParams.toString()
    );
  };

  const mode = (params.get("mode") ?? "sign in") as AuthorizationPageModes;

  if (loading) {
    return <Spinner />;
  }

  if (!config) {
    return (
      <IntakeFlowForm>
        <div className="LoginForm__Controls LoginForm__Fields">
          <div>
            This app is not configured for auth. Please contact the app owner.
          </div>
        </div>
      </IntakeFlowForm>
    );
  }

  if (
    !clientId ||
    !state ||
    !responseType ||
    !codeChallenge ||
    !codeChallengeMethod
  ) {
    const missingParams = [
      !clientId && "client_id",
      !state && "state",
      !responseType && "response_type",
      !codeChallenge && "code_challenge",
      !codeChallengeMethod && "code_challenge_method",
    ].filter((x) => x);

    return (
      <IntakeFlowForm>
        <div className="LoginForm__Controls LoginForm__Fields">
          <div>
            The app is not configured correctly. The following fields are
            missing <b>{missingParams.join(", ")}</b>. Please contact the app
            owner.
          </div>
        </div>
      </IntakeFlowForm>
    );
  }

  if (userEmail && !appCtx.selfInfo?.waitingEmailVerification) {
    if (!config.allowed) {
      return (
        <IntakeFlowForm>
          <div className="LoginForm__Controls LoginForm__Fields">
            <div>
              You ({userEmail}) aren't authorized to access the app{" "}
              <b>{config.appName}</b>. If you expect to be allowed, please
              contact the app owner.
            </div>
            <p>
              <LinkButton
                onClick={async () => {
                  await appCtx.api.logout();
                  appCtx.selfInfo = null;
                  changeModeAndNavigate("sign in");
                }}
              >
                {" "}
                Log out{" "}
              </LinkButton>{" "}
              to sign in with a different email.
            </p>
          </div>
        </IntakeFlowForm>
      );
    }

    return (
      <IntakeFlowForm>
        <div className="LoginForm__Controls LoginForm__Fields">
          <div>
            You are signing in to <b>{config.appName}</b>
          </div>
          <Button
            type="primary"
            size="large"
            onClick={() => {
              requestRedirect();
            }}
          >
            Sign in
          </Button>
        </div>
        <p>
          <LinkButton
            onClick={async () => {
              await appCtx.api.logout();
              appCtx.selfInfo = null;
              changeModeAndNavigate("sign in");
            }}
          >
            {" "}
            Sign out{" "}
          </LinkButton>{" "}
          to sign in with a different email.
        </p>
      </IntakeFlowForm>
    );
  }

  if (mode === "forgot password") {
    return (
      <AppForgotPasswordForm
        setMode={changeModeAndNavigate}
        appName={config.appName}
        emailResetPasswordPath={getCurrentPath()}
      />
    );
  }

  if (mode === "reset password") {
    return (
      <AppResetPasswordForm
        setMode={changeModeAndNavigate}
        appName={config.appName}
      />
    );
  }

  if (appCtx.selfInfo && appCtx.selfInfo.waitingEmailVerification) {
    return (
      <AppEmailVerification
        appName={config.appName}
        selfInfo={appCtx.selfInfo}
        emailVerificationPath={getCurrentPath()}
        onContinue={requestRedirect}
        setMode={changeModeAndNavigate}
      />
    );
  }

  return (
    <AppAuthForm
      mode={mode}
      requestRedirect={requestRedirect}
      setMode={changeModeAndNavigate}
      appName={config.appName}
      authorizationPath={getCurrentPath()}
    />
  );
}

type AppAuthFormProps = {
  mode: string;
  setMode: (mode: AuthorizationPageModes) => void;
  requestRedirect: () => void;
  appName: string;
  authorizationPath: string;
};

export function AppAuthForm({
  mode,
  requestRedirect,
  setMode,
  appName,
  authorizationPath,
}: AppAuthFormProps) {
  const {
    nonAuthCtx,
    appCtx,
    submitting,
    setSubmitting,
    currentPassword,
    setCurrentPassword,
    oauthFeedback,
    setOauthFeedback,
    formFeedback,
    setFormFeedback,
    nextPath,
    setSelfInfo,
    onSubmit,
  } = useAuthForm({
    mode,
    onLoggedIn: (login) => {
      if (login) {
        if (appCtx.selfInfo?.waitingEmailVerification) {
          setMode("email verification");
        } else {
          trackEvent("app-auth", {
            action: "authorize",
          });
          requestRedirect();
        }
      } else {
        setMode("email verification");
      }
    },
    appInfo: {
      appName,
      authorizationPath,
    },
  });

  const setModeAndClearError = (_mode: AuthorizationPageModes) => {
    setMode(_mode);
    setFormFeedback(undefined);
    setOauthFeedback(undefined);
  };

  return (
    <IntakeFlowForm>
      <div>
        You are logging in to <b>{appName}</b>
      </div>
      <div className={"LoginForm__Controls"}>
        <div className={"LoginForm__Oauth"}>
          <GoogleSignInButton
            onStart={() => {
              setFormFeedback(undefined);
              setOauthFeedback(undefined);
            }}
            onSuccess={async () => {
              await nonAuthCtx.api.refreshCsrfToken();
              const { user } = await nonAuthCtx.api.getSelfInfo();
              setSelfInfo(user);
            }}
            onFailure={(reason) => {
              if (reason === "UserNotWhitelistedError") {
                location.href = "https://plasmic.app/intake";
              } else {
                setOauthFeedback({
                  type: "error",
                  content: "Unexpected error occurred logging in.",
                });
              }
            }}
            googleAuthUrl={U.googleAuth({})}
          >
            {mode === "sign in" ? "Sign in with Google" : "Sign up with Google"}
          </GoogleSignInButton>
          <FormFeedback feedback={oauthFeedback} />
        </div>
        <Divider>
          <span className={"light-text"}>or</span>
        </Divider>
        <form onSubmit={onSubmit} className={"LoginForm__Fields"}>
          <FormFeedback feedback={formFeedback} />
          <Input
            defaultValue={
              new URL(location.href).searchParams.get("email") || ""
            }
            name={"email"}
            type={"input"}
            size={"large"}
            placeholder={"Email address"}
          />
          <Input
            name={"password"}
            type={"password"}
            size={"large"}
            placeholder={"Password"}
            autoComplete={"off"}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          {mode === "sign up" && (
            <React.Suspense>
              <LazyPasswordStrengthBar
                className="LoginForm__SmallMargin"
                password={currentPassword}
              />
              <Input
                name={"firstName"}
                type={"firstName"}
                size={"large"}
                placeholder={"First name"}
              />
              <Input
                name={"lastName"}
                type={"lastName"}
                size={"large"}
                placeholder={"Last name"}
              />
            </React.Suspense>
          )}
          <Button
            loading={submitting}
            htmlType={"submit"}
            type={"primary"}
            size={"large"}
          >
            {mode === "sign in" ? "Sign in" : "Sign up"}
          </Button>
        </form>
        {mode === "sign in" && (
          <div className={"LoginForm__SignUpOrInToggle"}>
            <LinkButton onClick={() => setMode("forgot password")}>
              I forgot my password.
            </LinkButton>
            <br />
            New user?{" "}
            <LinkButton onClick={() => setModeAndClearError("sign up")}>
              Create account
            </LinkButton>
          </div>
        )}
        {mode === "sign up" && (
          <div className={"LoginForm__SignUpOrInToggle"}>
            Existing user?{" "}
            <LinkButton onClick={() => setModeAndClearError("sign in")}>
              Sign in
            </LinkButton>
          </div>
        )}
      </div>
    </IntakeFlowForm>
  );
}

export function AppEmailVerification(props: {
  selfInfo: ApiUser;
  appName: string;
  emailVerificationPath: string;
  onContinue: () => void;
  setMode: (mode: AuthorizationPageModes) => void;
}) {
  const {
    selfInfo,
    appName,
    emailVerificationPath,
    onContinue,
    setMode: setPageMode,
  } = props;
  const { appCtx, nonAuthCtx, mode, setMode, showEmailSentNotification } =
    useEmailVerification(selfInfo);

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
                Now we know it's you, you can start getting the best out of{" "}
                {appName}.
              </p>
              <Button
                type={"primary"}
                size={"large"}
                block={true}
                onClick={() => {
                  onContinue();
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
                      nextPath: emailVerificationPath,
                      appName,
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
                <LinkButton
                  onClick={async () => {
                    await appCtx.logout();
                    appCtx.selfInfo = null;
                    setPageMode("sign in");
                  }}
                >
                  {" "}
                  Log out{" "}
                </LinkButton>{" "}
                to sign in with a different email.
              </p>
            </div>
          ) : mode === "email-sent" ? (
            <div>
              <h2>Verify your email address!</h2>
              <p>
                To use <strong>{appName}</strong>, click the verification link
                in the email we sent to <strong>{selfInfo.email}</strong>. This
                helps keep your account secure.
              </p>
              <p>
                No email in your inbox or spam folder? Let’s
                <LinkButton
                  onClick={async () => {
                    showEmailSentNotification();
                    if (!selfInfo.isFake) {
                      await nonAuthCtx.api.sendEmailVerification({
                        email: selfInfo.email,
                        nextPath: emailVerificationPath,
                        appName,
                      });
                    } else {
                      await nonAuthCtx.api.forgotPassword({
                        email: selfInfo.email,
                        appName,
                        nextPath: emailVerificationPath,
                      });
                    }
                  }}
                >
                  resend it.
                </LinkButton>
              </p>
              <p>
                Not you?{" "}
                <LinkButton
                  onClick={async () => {
                    await appCtx.api.logout();
                    appCtx.selfInfo = null;
                    setPageMode("sign in");
                  }}
                >
                  {" "}
                  Log out{" "}
                </LinkButton>{" "}
                to sign in with a different email.
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

export function AppForgotPasswordForm({
  setMode,
  appName,
  emailResetPasswordPath,
}: {
  setMode: (mode: AuthorizationPageModes) => void;
  appName: string;
  emailResetPasswordPath: string;
}) {
  const nonAuthCtx = useNonAuthCtx();
  const [submitting, setSubmitting] = React.useState(false);
  const [feedback, setFeedback] = React.useState<undefined | Feedback>(
    undefined
  );
  return (
    <IntakeFlowForm>
      <div className="LoginForm__Controls">
        <form
          className="LoginForm__Fields"
          onSubmit={async (e) => {
            e.preventDefault();
            const { email } = $(e.target).serializeJSON();
            setSubmitting(true);
            await nonAuthCtx.api.forgotPassword({
              email: email.trim(),
              appName,
              nextPath: emailResetPasswordPath,
            });
            setFeedback({
              type: "success",
              content: "Success! Check your email for instructions.",
            });
            setSubmitting(false);
          }}
        >
          <FormFeedback feedback={feedback} />
          <Input
            defaultValue={
              new URL(location.href).searchParams.get("email") || ""
            }
            name={"email"}
            size={"large"}
            placeholder={"Email address"}
          />
          <Button
            loading={submitting}
            htmlType={"submit"}
            type={"primary"}
            size={"large"}
          >
            Send password reset link
          </Button>
        </form>
        <div className={"LoginForm__SignUpOrInToggle"}>
          Existing user?{" "}
          <LinkButton onClick={() => setMode("sign in")}>Sign in</LinkButton>
        </div>
      </div>
    </IntakeFlowForm>
  );
}

export function AppResetPasswordForm({
  setMode,
  appName,
}: {
  setMode: (mode: AuthorizationPageModes) => void;
  appName: string;
}) {
  const nonAuthCtx = useNonAuthCtx();
  const [submitting, setSubmitting] = React.useState(false);
  const [feedback, setFeedback] = React.useState<undefined | Feedback>(
    undefined
  );
  return (
    <IntakeFlowForm>
      <div className="LoginForm__Controls">
        <form
          className="LoginForm__Fields"
          onSubmit={async (e) => {
            e.preventDefault();
            const { email, password } = $(e.target).serializeJSON();

            setSubmitting(true);
            const res = await nonAuthCtx.api.resetPassword({
              email: email.trim(),
              resetPasswordToken:
                new URL(location.href).searchParams.get("token") || "",
              newPassword: password.trim(),
            });
            setSubmitting(false);

            if (res.status) {
              notification.success({
                message: "Your password has been reset!",
                description: "You can now sign in with your new password.",
              });
              setMode("sign in");
            } else {
              if (res.reason === "WeakPasswordError") {
                setFeedback({
                  type: "error",
                  content: "Please try a stronger password.",
                });
              } else if (res.reason === "InvalidToken") {
                setFeedback({
                  type: "error",
                  content:
                    "The password reset link has expired. Submit the form below to generate a new one.",
                });
                setMode("forgot password");
              } else {
                setFeedback({
                  type: "error",
                  content: "Unexpected error occured.",
                });
              }
            }
          }}
        >
          <h1>Reset your password for {appName}</h1>
          <FormFeedback feedback={feedback} />
          <Input
            defaultValue={
              new URL(location.href).searchParams.get("email") || ""
            }
            name={"email"}
            size={"large"}
            type="hidden"
            placeholder={"Email address"}
          />
          <Input
            name={"password"}
            type={"password"}
            size={"large"}
            placeholder={"New password"}
          />
          <Button
            loading={submitting}
            htmlType={"submit"}
            type={"primary"}
            size={"large"}
          >
            Reset password
          </Button>
        </form>
      </div>
    </IntakeFlowForm>
  );
}
