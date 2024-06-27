import { Api } from "@/wab/client/api";
import { ConnectOAuthButton } from "@/wab/client/components/auth/ConnectOAuth";
import { mkShortId, spawn } from "@/wab/shared/common";
import { PromisifyMethods } from "@/wab/commons/promisify-methods";
import { DEVFLAGS } from "@/wab/shared/devflags";
import React from "react";

const githubOAuthURL = "https://github.com/login/oauth/authorize";
const githubInstallURL = `https://github.com/apps/${DEVFLAGS.githubAppName}/installations/new`;

export type AuthType = "oauth" | "install";

export function getURL(type: AuthType, state: string): string {
  return type === "oauth"
    ? `${githubOAuthURL}?client_id=${DEVFLAGS.githubClientId}&state=${state}`
    : `${githubInstallURL}?state=${state}`;
}

export function GithubConnect(props: {
  api: PromisifyMethods<Api>;
  type: AuthType;
  render: (props: { onClick: () => void; isWaiting: boolean }) => JSX.Element;
  onSuccess: () => void;
  onFailure?: (reason: string) => void;
  refreshDeps?: any[];
}) {
  const [githubState, setGithubState] = React.useState("");
  const refreshGithubState = async () => {
    const state = mkShortId();
    await props.api.addStorageItem("githubState", state);
    setGithubState(state);
  };
  React.useEffect(() => spawn(refreshGithubState()), props.refreshDeps || []);

  return (
    <ConnectOAuthButton
      onSuccess={props.onSuccess}
      onFailure={props.onFailure}
      url={getURL(props.type, githubState)}
      render={props.render}
      children={null}
    />
  );
}
