import { getGithubSecrets } from "@/wab/server/secrets";
import { ensure } from "@/wab/shared/common";
import { App } from "@octokit/app";

let githubApp: App | null;

export function getGithubApp(): App {
  if (githubApp) {
    return githubApp;
  }

  return (githubApp = new App(ensure(getGithubSecrets(), "")));
}
