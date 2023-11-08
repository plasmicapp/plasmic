import { App } from "@octokit/app";
import { ensure } from "../../common";
import { getGithubSecrets } from "../secrets";

let githubApp: App | null;

export function getGithubApp(): App {
  if (githubApp) {
    return githubApp;
  }

  return (githubApp = new App(ensure(getGithubSecrets(), "")));
}
