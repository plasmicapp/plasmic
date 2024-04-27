import { getGithubApp } from "@/wab/server/github/app";
import { App } from "@octokit/app";
import { composePaginateRest } from "@octokit/plugin-paginate-rest";

export async function fetchGithubBranches(
  installationId: number,
  repository: string
) {
  const [owner, repo] = repository.split("/");
  const branches: string[] = [];
  const app = getGithubApp();

  for await (const { branch } of branchesIterator(
    app,
    installationId,
    owner,
    repo
  )) {
    branches.push(branch.name);
  }

  return branches;
}

function branchesIterator(
  app: App,
  installationId: number,
  owner: string,
  repo: string
) {
  return {
    async *[Symbol.asyncIterator]() {
      const octokit = await app.getInstallationOctokit(installationId);
      const iterator = composePaginateRest.iterator(
        octokit,
        "GET /repos/{owner}/{repo}/branches",
        { owner, repo }
      );

      for await (const { data: branches } of iterator) {
        for (const branch of branches) {
          yield { branch };
        }
      }
    },
  };
}

export async function getDefaultBranch(
  installationId: number,
  owner: string,
  repo: string
) {
  const app = getGithubApp();
  const octokit = await app.getInstallationOctokit(installationId);
  const { data } = await octokit.request("GET /repos/{owner}/{repo}", {
    owner,
    repo,
  });
  return data.default_branch;
}
