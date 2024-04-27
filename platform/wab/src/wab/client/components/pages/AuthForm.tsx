import { NonAuthCtx, useNonAuthCtx } from "@/wab/client/app-ctx";
import { isPlasmicPath, U, UU } from "@/wab/client/cli-routes";
import {
  GoogleSignInButton,
  useAuthPopup,
} from "@/wab/client/components/auth/ConnectOAuth";
import "@/wab/client/components/pages/AuthForm.sass";
import { IntakeFlowForm } from "@/wab/client/components/pages/IntakeFlowForm";
import { LinkButton } from "@/wab/client/components/widgets";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { mkUuid, spawnWrapper } from "@/wab/common";
import { ApiUser, UserId } from "@/wab/shared/ApiSchema";
import { Button, Divider, Input, notification } from "antd";
import $ from "jquery";
import * as React from "react";
import { useState } from "react";
import { Redirect } from "react-router-dom";
import useSWR from "swr";
const LazyPasswordStrengthBar = React.lazy(
  () => import("@/wab/client/components/PasswordStrengthBar")
);

type Mode =
  | "sign in"
  | "sign up"
  | "forgot password"
  | "reset password"
  | "sso";

interface AuthFormProps {
  mode: "sign in" | "sign up";
  onLoggedIn: () => void;
}

export function useAuthForm({
  mode,
  onLoggedIn,
  appInfo,
}: {
  mode: string;
  onLoggedIn: (login: boolean) => void;
  appInfo?: {
    appName: string;
    authorizationPath: string;
  };
}) {
  const nonAuthCtx = useNonAuthCtx();
  const appCtx = useAppCtx();

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [oauthFeedback, setOauthFeedback] = useState<undefined | Feedback>(
    undefined
  );
  const [formFeedback, setFormFeedback] = useState<undefined | Feedback>(
    undefined
  );
  const nextPath = getNextPath();

  function setSelfInfo(user: ApiUser, login = true) {
    setTimeout(() => {
      appCtx.selfInfo = user;
      onLoggedIn(login);
    });
  }

  function setModeAndClearError(newMode: Mode) {
    setFormFeedback(undefined);
    setOauthFeedback(undefined);
    setMode(nonAuthCtx, newMode);
  }

  async function onSubmit(e) {
    e.preventDefault();
    let { email, password, firstName, lastName } = $(e.target).serializeJSON();
    email = email.trim();
    firstName = firstName?.trim();
    lastName = lastName?.trim();
    setSubmitting(true);
    try {
      await nonAuthCtx.api.refreshCsrfToken();

      const res =
        mode === "sign in"
          ? await nonAuthCtx.api.login({ email, password, appInfo })
          : await nonAuthCtx.api.signUp({
              email,
              password,
              firstName,
              lastName,
              nextPath,
              appInfo,
            });
      if (res.status) {
        setSelfInfo(res.user);
      } else {
        if (res.reason === "IncorrectLoginError") {
          setFormFeedback({
            type: "error",
            content: "That email and password combination is incorrect.",
          });
        } else if (res.reason === "WeakPasswordError") {
          setFormFeedback({
            type: "error",
            content: "Please try a stronger password.",
          });
        } else if (res.reason === "PwnedPasswordError") {
          setFormFeedback({
            type: "error",
            content:
              "Password is a known leaked password. Please try another password.",
          });
        } else if (res.reason === "BadEmailError") {
          setFormFeedback({
            type: "error",
            content: "Please use a valid email address.",
          });
        } else if (res.reason === "MissingFieldsError") {
          setFormFeedback({
            type: "error",
            content: "Please fill in all fields.",
          });
        } else if (res.reason === "EmailSent") {
          setSelfInfo(createFakeUser(email, firstName, lastName), false);
        } else if (res.reason === "UserNotWhitelistedError") {
          setFormFeedback(undefined);
          location.href = `https://plasmic.app/intake`;
        } else {
          setFormFeedback({
            type: "error",
            content: "Unexpected error occurred logging in.",
          });
        }
      }
    } catch (err) {
      setFormFeedback({
        type: "error",
        content: "Unexpected error occurred logging in.",
      });
      throw err;
    } finally {
      setSubmitting(false);
    }
  }

  return {
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
    setModeAndClearError,
    onSubmit,
  };
}

export function AuthForm({ mode, onLoggedIn }: AuthFormProps) {
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
    setModeAndClearError,
    onSubmit,
  } = useAuthForm({
    mode,
    onLoggedIn: (login) => {
      onLoggedIn();
      if (login) {
        appCtx.router.routeTo(nextPath);
      } else {
        appCtx.router.routeTo(
          UU.survey.fill(
            {},
            {
              continueTo: U.emailVerification({}),
            }
          )
        );
      }
    },
  });

  return (
    <IntakeFlowForm>
      {appCtx.selfInfo ? (
        <Redirect to={nextPath} />
      ) : (
        <div className={"LoginForm__Controls"}>
          {["sign up", "sign in"].includes(mode) && (
            <>
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
                  {mode === "sign in"
                    ? "Sign in with Google"
                    : "Sign up with Google"}
                </GoogleSignInButton>
                <FormFeedback feedback={oauthFeedback} />
              </div>
            </>
          )}
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
              placeholder={"Work email address"}
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
              <LinkButton
                onClick={() => setMode(nonAuthCtx, "forgot password")}
              >
                I forgot my password.
              </LinkButton>
              <br />
              New user?{" "}
              <LinkButton onClick={() => setModeAndClearError("sign up")}>
                Create account
              </LinkButton>
              <br />
              <LinkButton onClick={() => setModeAndClearError("sso")}>
                Sign in with SSO
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
      )}
    </IntakeFlowForm>
  );
}

export type Feedback = { type: "error" | "success"; content: React.ReactNode };

export function ResetPasswordForm() {
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
              setMode(nonAuthCtx, "sign in");
            } else {
              if (res.reason === "WeakPasswordError") {
                setFeedback({
                  type: "error",
                  content: "Please try a stronger password.",
                });
              } else if (res.reason === "InvalidToken") {
                setFeedback({
                  type: "error",
                  content: "The password reset link has expired.",
                });
              } else {
                setFeedback({
                  type: "error",
                  content: "Unexpected error occured.",
                });
              }
            }
          }}
        >
          <h1>Reset password</h1>
          <FormFeedback feedback={feedback} />
          <Input
            defaultValue={
              new URL(location.href).searchParams.get("email") || ""
            }
            name={"email"}
            size={"large"}
            type="hidden"
            placeholder={"Work email address"}
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

export function FormFeedback(props: { feedback?: Feedback }) {
  const { feedback } = props;
  if (!feedback) {
    return null;
  } else {
    return (
      <div
        className={
          feedback.type === "error" ? "LoginForm__Error" : "LoginForm__Feedback"
        }
      >
        {feedback.content}
      </div>
    );
  }
}

export function ForgotPasswordForm() {
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
            await nonAuthCtx.api.forgotPassword({ email: email.trim() });
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
            placeholder={"Work email address"}
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
      </div>
    </IntakeFlowForm>
  );
}

export function SsoLoginForm(props: { onLoggedIn: () => void }) {
  const nonAuthCtx = useNonAuthCtx();
  const appCtx = useAppCtx();
  const [submitting, setSubmitting] = React.useState(false);
  const [feedback, setFeedback] = React.useState<undefined | Feedback>(
    undefined
  );

  const { mutate: mutatePreviousSsoEmail, data: previousSsoEmail } = useSWR(
    "plasmic-sso-email",
    async () => await nonAuthCtx.api.getStorageItem("plasmic-sso-email")
  );

  function setSelfInfo(user: ApiUser) {
    setTimeout(() => {
      appCtx.selfInfo = user;
      appCtx.router.routeTo(getNextPath());
      props.onLoggedIn();
    });
  }
  const { isWaiting, open } = useAuthPopup({
    onSuccess: spawnWrapper(async () => {
      await nonAuthCtx.api.refreshCsrfToken();
      const { user } = await nonAuthCtx.api.getSelfInfo();
      await nonAuthCtx.api.addStorageItem("plasmic-sso-email", user.email);
      await mutatePreviousSsoEmail(user.email);
      setSelfInfo(user);
    }),
    onFailure: (reason) => {
      setFeedback({ type: "error", content: reason });
      setSubmitting(false);
    },
  });
  return (
    <IntakeFlowForm>
      <div className="LoginForm__Controls">
        <form
          className="LoginForm__Fields"
          onSubmit={async (e) => {
            e.preventDefault();
            const { email } = $(e.target).serializeJSON();
            setSubmitting(true);
            const ssoTest = await nonAuthCtx.api.isValidSsoEmail(email.trim());
            setSubmitting(false);
            if (!ssoTest.valid) {
              setFeedback({
                type: "error",
                content: (
                  <>
                    Your account is not configured to use SSO.{" "}
                    <LinkButton
                      type="button"
                      onClick={() => setMode(nonAuthCtx, "sign in")}
                    >
                      Sign in with Google or a password instead.
                    </LinkButton>
                  </>
                ),
              });
            } else {
              await nonAuthCtx.api.removeStorageItem("authStatus");
              open(`/api/v1/auth/sso/${ssoTest.tenantId}/login`);
            }
          }}
        >
          <h1>Sign in with SSO</h1>
          <FormFeedback feedback={feedback} />
          <Input
            key={previousSsoEmail}
            defaultValue={previousSsoEmail ?? undefined}
            name={"email"}
            size={"large"}
            placeholder={"Work email address"}
            disabled={submitting || isWaiting}
          />
          <Button
            loading={submitting || isWaiting}
            htmlType={"submit"}
            type={"primary"}
            size={"large"}
          >
            Login
          </Button>
          <br />
          <LinkButton onClick={() => setMode(nonAuthCtx, "sign in")}>
            Sign in with Google or a password
          </LinkButton>
        </form>
      </div>
    </IntakeFlowForm>
  );
}

function setMode(nonAuthCtx: NonAuthCtx, newMode: Mode) {
  const nextPath = getNextPath();
  nonAuthCtx.router.routeTo(
    newMode === "sign in"
      ? UU.login.fill({}, { continueTo: nextPath })
      : newMode === "sign up"
      ? UU.signup.fill({}, { continueTo: nextPath })
      : newMode === "sso"
      ? UU.sso.fill({}, { continueTo: nextPath })
      : newMode === "forgot password"
      ? UU.forgotPassword.fill({}, { continueTo: nextPath })
      : UU.resetPassword.fill({}, { continueTo: nextPath })
  );
}

function getNextPath() {
  const continueToPath = new URLSearchParams(location.search).get("continueTo");
  return continueToPath && isPlasmicPath(continueToPath)
    ? continueToPath
    : U.dashboard({});
}

function createFakeUser(
  email: string,
  firstName: string,
  lastName: string
): ApiUser {
  return {
    id: mkUuid() as UserId,
    email: email,
    firstName: firstName,
    lastName: lastName,
    avatarUrl: null,
    needsIntroSplash: false,
    extraData: null,
    needsSurvey: true,
    waitingEmailVerification: true,
    createdAt: Date.now().toLocaleString(),
    updatedAt: Date.now().toLocaleString(),
    deletedAt: null,
    createdById: null,
    updatedById: null,
    deletedById: null,
    isFake: true,
  };
}
