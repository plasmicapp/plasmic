import { tryCatchElseAsync, unexpected } from "@/wab/common";
import { DbMgr } from "@/wab/server/db/DbMgr";
import { ProjectRepository } from "@/wab/server/entities/Entities";
import { getGithubApp } from "@/wab/server/github/app";
import { GithubRef } from "@/wab/server/github/types";
import { Octokit } from "@octokit/core";
import * as Sentry from "@sentry/node";
import { failableAsync } from "ts-failable";

type SetupGithubPagesError = "domain taken";

async function initPagesBranch(octokit: Octokit, ref: GithubRef) {
  const { owner, repo, branch } = ref;

  const {
    data: { sha: treeSha },
  } = await octokit.request("POST /repos/{owner}/{repo}/git/trees", {
    owner,
    repo,
    tree: [
      {
        path: "index.html",
        mode: "100644",
        type: "blob",
        content:
          "The repository setup worked. Publish your project to overwrite this message.\n",
      },
    ],
  });
  const {
    data: { sha: commitSha },
  } = await octokit.request("POST /repos/{owner}/{repo}/git/commits", {
    owner,
    repo,
    message: "Initial commit",
    tree: treeSha,
  });
  await octokit.request("POST /repos/{owner}/{repo}/git/refs", {
    owner,
    repo,
    ref: `refs/heads/${branch}`,
    sha: commitSha,
  });
}

/**
 * Assumptions:
 *
 * - The chosen branch doesn't already exist in the repo.
 * - GitHub Pages is not already set up for the repo. (TODO handle updates)
 * - The given `domain` already is configured as a CNAME to point to
 *   something.github.io, and isn't already taken by any existing GitHub
 *   project (or the setup request will fail).
 * - The repo can not be empty (i.e., without branches).
 *
 * Limitations:
 *
 * - There doesn't seem to be a documented way to enable Force HTTPS on the
 *   domain.
 */
export async function setupGithubPages(ref: GithubRef, domain: string) {
  return failableAsync<void, SetupGithubPagesError>(
    async ({ success, failure }) => {
      const { installationId, owner, repo, branch } = ref;

      const app = getGithubApp();
      const octokit = await app.getInstallationOctokit(installationId);

      await initPagesBranch(octokit, ref);

      await octokit.request("POST /repos/{owner}/{repo}/pages", {
        owner,
        repo,
        source: {
          branch,
        },
        mediaType: {
          previews: ["switcheroo"],
        },
      });

      try {
        await octokit.request("PUT /repos/{owner}/{repo}/pages", {
          owner,
          repo,
          cname: domain,
          source: {
            branch,
            path: "/",
          } as any,
        });
      } catch (err) {
        if (err.message.includes("is already taken")) {
          return failure("domain taken");
        }
      }
      return success();
    }
  );
}

export async function tryUpdateCachedCname(
  mgr: DbMgr,
  projectRepository: ProjectRepository
) {
  const { installationId, repository } = projectRepository;
  const [owner, repo] = repository.split("/");
  // We best-effort update the cachedCname.
  await tryCatchElseAsync({
    try: async () => {
      const app = getGithubApp();
      const octokit = await app.getInstallationOctokit(installationId);

      // We always assume branch is gh-pages.
      const { data } = await octokit.request(
        "GET /repos/{owner}/{repo}/contents/{path}",
        {
          owner,
          repo,
          ref: "gh-pages",
          path: "CNAME",
        }
      );
      if ("content" in data) {
        return Buffer.from(data.content, "base64").toString("ascii");
      } else {
        unexpected();
      }
    },
    catch: async (err) => {
      Sentry.captureException(
        "Could not read CNAME. May be removed, or Pages points to a different branch. Not an error; this is best-effort. Failure was:",
        err
      );
    },
    else: async (cname) => {
      await mgr.updateProjectRepository({
        id: projectRepository.id,
        cachedCname: cname,
      });
    },
  });
}
