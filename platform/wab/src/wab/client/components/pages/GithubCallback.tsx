import * as React from "react";
import { NonAuthCtx } from "../../app-ctx";
import { useAsyncStrict } from "../../hooks/useAsyncStrict";
import { getURL } from "../auth/GithubConnect";

export function GithubCallback(props: { nonAuthCtx: NonAuthCtx }) {
  const [err, setErr] = React.useState("");

  useAsyncStrict(async () => {
    const params = new URLSearchParams(location.search);
    const state = params.get("state");
    const expectedState = localStorage.getItem("githubState");

    if (typeof state !== "string" || state !== expectedState) {
      // This can happen in 3 cases:
      // 1. The installation was added/modified on GitHub panel.
      // 2. Expected state changed (user refreshed studio page or
      // reloaded settings page).
      // 3. The installation request was forged by a bad actor.
      //
      // In any of those cases, we don't want to connect this installation
      // ID.

      if (window.opener && window.opener !== window) {
        // This is a popup. We assume this is case 2 and print an error.
        setErr("Unexpected state.");
        return;
      } else {
        // This is not a popup. We assume this is case 1 and just redirect
        // to studio home.
        location.href = "/";
        return;
      }
    }

    const code = params.get("code");
    if (!code) {
      setErr("Missing code.");
      return;
    }

    try {
      const { token, installations } =
        await props.nonAuthCtx.api.connectGithubInstallations(state, code);
      if (installations.length === 0) {
        location.href = getURL("install", state);
      } else {
        localStorage.setItem("githubToken", token);
        localStorage.setItem("authStatus", "Success");
        window.close();
      }
    } catch (e) {
      localStorage.setItem("authStatus", e.message);
      setErr(e.message);
    }
  });

  return <div>{err || "Loading..."}</div>;
}
