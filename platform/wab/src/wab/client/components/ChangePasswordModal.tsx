import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import {
  DefaultChangePasswordModalProps,
  PlasmicChangePasswordModal,
} from "@/wab/client/plasmic/plasmic_kit_user_settings/PlasmicChangePasswordModal";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

type ChangePasswordModalProps = DefaultChangePasswordModalProps;

const unexpectedError =
  "An unexpected error occurred when trying to change your password. Please try again later.";

function ChangePasswordModal_(
  props: ChangePasswordModalProps,
  ref: HTMLElementRefOf<"div">
) {
  const appCtx = useAppCtx();
  const [oldPassword, setOldPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await appCtx.api.changePassword(
        oldPassword,
        newPassword
      );
      if (response.status === true) {
        setDone(true);
      } else {
        switch (response.reason) {
          case "WeakPasswordError":
            setError("Please try a stronger password.");
            break;
          case "PwnedPasswordError":
            setError(
              "Password is a known leaked password. Please try another password."
            );
            break;
          case "MismatchPasswordError":
            setError("Old password does not match.");
            break;
          default:
            setError(unexpectedError);
        }
      }
    } catch (err) {
      setError(unexpectedError);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  React.useEffect(() => {
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
    } else {
      setError("");
    }
  }, [oldPassword, newPassword, confirmPassword]);

  return (
    <PlasmicChangePasswordModal
      root={{ ref }}
      form={{
        onSubmit,
      }}
      isFeedback={done}
      hasError={!!error}
      error={error}
      oldPasswordInput={{
        props: {
          type: "password",
          onChange: (e) => setOldPassword(e.target.value),
          value: oldPassword,
        },
      }}
      newPasswordInput={{
        props: {
          type: "password",
          onChange: (e) => setNewPassword(e.target.value),
          value: newPassword,
        },
      }}
      passwordStrengthBar={{
        props: {
          password: newPassword,
        },
      }}
      confirmPasswordInput={{
        props: {
          type: "password",
          onChange: (e) => setConfirmPassword(e.target.value),
          value: confirmPassword,
        },
      }}
      submitButton={{
        disabled:
          !oldPassword ||
          !newPassword ||
          newPassword !== confirmPassword ||
          submitting,
        htmlType: "submit",
      }}
      {...props}
    />
  );
}

const ChangePasswordModal = React.forwardRef(ChangePasswordModal_);
export default ChangePasswordModal;
