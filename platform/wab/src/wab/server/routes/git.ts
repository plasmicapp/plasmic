import {
  coalesceErrorsAsync,
  liftErrorsAsync,
  sealedFailableAsync,
} from "@/wab/commons/control";
import { getGithubApp } from "@/wab/server/github/app";
import { fetchGithubBranches } from "@/wab/server/github/branches";
import { detectSyncOptions } from "@/wab/server/github/detect";
import { runGitJob } from "@/wab/server/github/gitjobs";
import { setupGithubPages } from "@/wab/server/github/pages";
import { fetchGithubRepositories } from "@/wab/server/github/repos";
import { assertCanUseGithubRepository } from "@/wab/server/github/util";
import {
  createOrUpdatePushWorkflow,
  createOrUpdateWorkflow,
  getGitJob,
  tryGetLastUnfinishedWorkflowRun,
} from "@/wab/server/github/workflows";
import { getUser, parseQueryParams, userDbMgr } from "@/wab/server/routes/util";
import { NotFoundError } from "@/wab/shared/ApiErrors/errors";
import {
  ApiProjectRepository,
  ExistingGithubRepoRequest,
  GitBranchesResponse,
  GitRepository,
  GitSyncAction,
  GithubData,
  GithubOrganization,
  NewGithubRepoRequest,
  NewGithubRepoResponse,
} from "@/wab/shared/ApiSchema";
import {
  assert,
  ensure,
  ensureString,
  ensureType,
  uncheckedCast,
} from "@/wab/shared/common";
import { Octokit } from "@octokit/core";
import type { components } from "@octokit/openapi-types";
import * as Sentry from "@sentry/node";
import { Request, Response } from "express-serve-static-core";
import { IFailable } from "ts-failable";

function tryGetGithubTokenHeader(req: Request) {
  return req.headers["x-plasmic-github-token"] as string | undefined;
}

export async function connectGithubInstallations(req: Request, res: Response) {
  const state = req.body.state as string;
  const code = req.body.code as string;

  const app = getGithubApp();

  // Get personal access token using code.
  const {
    authentication: { token },
  } = await app.oauth.createToken({
    state,
    code,
  });

  // Get user installations.
  const octokit = new Octokit({ auth: token });
  const {
    data: { installations },
  } = await octokit.request("GET /user/installations");

  res.json({ token, installations: installations.map((i) => i.id) });
}

export async function githubData(req: Request, res: Response) {
  const { token: maybeToken } = parseQueryParams(req);
  const token = ensureString(maybeToken ?? tryGetGithubTokenHeader(req));

  const octokit = new Octokit({ auth: token });
  const repositories: GitRepository[] = [];
  const organizations: GithubOrganization[] = [];

  const { data: user } = await octokit.request("GET /user");
  const {
    data: { installations },
  } = await octokit.request("GET /user/installations");
  for (const installation of installations) {
    const installationId = installation.id;

    // https://github.com/github/rest-api-description/issues/5421
    // Octokit are wrong. We replaced "enterprise" with "organization-full".
    const installationAccount = installation.account as
      | components["schemas"]["simple-user"]
      | components["schemas"]["organization-full"]
      | null;
    if (
      installationAccount?.type === "Organization" ||
      installationAccount?.login === user.login
    ) {
      organizations.push({
        installationId,
        login: ensure(installationAccount.login, () => `Already checked login`),
        type: ensure(installationAccount.type, () => `Already checked type`),
      });
    }

    repositories.push(
      ...(await fetchGithubRepositories(octokit, installationId))
    );
  }

  res.json(
    ensureType<GithubData>({
      organizations,
      repositories,
    })
  );
}

export async function setupExistingGithubRepo(req: Request, res: Response) {
  const { token: maybeToken, repository }: ExistingGithubRepoRequest = req.body;
  const token = ensureString(maybeToken ?? tryGetGithubTokenHeader(req));
  const { installationId, name } = repository;
  const [owner, repo] = name.split("/");

  await assertCanUseGithubRepository(token, owner, repo);
  await createOrUpdateWorkflow({
    installationId,
    owner,
    repo,
  });
  res.json({});
}

export async function setupNewGithubRepo(req: Request, res: Response) {
  const result = await sealedFailableAsync<
    NewGithubRepoResponse,
    "repo exists" | "domain taken" | Error
  >(async ({ success, run }) => {
    const _user = getUser(req);

    const {
      token: maybeToken,
      org,
      name,
      privateRepo,
      domain,
    }: NewGithubRepoRequest = req.body;
    const token = ensureString(maybeToken ?? tryGetGithubTokenHeader(req));

    const octokit = new Octokit({ auth: token });

    const { data } = run(
      (
        await liftErrorsAsync(async () =>
          org.type === "User"
            ? await octokit.request("POST /user/repos", {
                name,
                private: privateRepo,
              })
            : await octokit.request("POST /orgs/{org}/repos", {
                org: org.login,
                name,
                private: privateRepo,
              })
        )
      ).mapError((err) => {
        if ("errors" in err) {
          const error = err["errors"]?.[0];
          if (error?.["message"] === "name already exists on this account") {
            return "repo exists";
          }
        }
        return err;
      })
    );

    const [owner, repo] = data.full_name.split("/");

    // Transactionally try to set up Actions and Pages - if they fail, just
    // delete the repo.
    async function cleanup() {
      try {
        await octokit.request("DELETE /repos/{owner}/{repo}", {
          owner,
          repo,
        });
      } catch (err) {
        Sentry.withScope((scope) => {
          scope.addBreadcrumb({
            data: {
              orgType: org.type,
              newRepoReturn: data,
            },
          });
          Sentry.captureException(err);
        });
      }
    }

    const maybeCleanup = async <T, E>(
      _res: Promise<IFailable<T, E>>
    ): Promise<IFailable<T, E>> => {
      if ((await _res).result.isError) {
        await cleanup();
      }
      return _res;
    };

    run(
      await maybeCleanup(
        liftErrorsAsync(() =>
          createOrUpdateWorkflow({
            installationId: org.installationId,
            owner,
            repo,
          })
        )
      )
    );

    if (domain) {
      run(
        await maybeCleanup(
          coalesceErrorsAsync(() =>
            setupGithubPages(
              {
                installationId: org.installationId,
                owner,
                repo,
                branch: "gh-pages",
              },
              domain
            )
          )
        )
      );

      run(
        await maybeCleanup(
          liftErrorsAsync(() =>
            createOrUpdatePushWorkflow({
              installationId: org.installationId,
              owner,
              repo,
              branch: data.default_branch,
            })
          )
        )
      );
    }

    return success({
      type: "Repo",
      repo: {
        name: data.full_name,
        installationId: org.installationId,
        defaultBranch: data.default_branch,
      },
    });
  });

  result.match({
    success: (value) => {
      res.json(ensureType<NewGithubRepoResponse>(value));
    },
    failure: (err) => {
      switch (err) {
        case "domain taken":
        case "repo exists":
          res.json(
            ensureType<NewGithubRepoResponse>({
              type: "KnownError",
              knownError: err,
            })
          );
          break;
        default:
          throw err;
      }
    },
  });
}

export async function addProjectRepository(req: Request, res: Response) {
  const {
    projectId,
    installationId,
    repository,
    directory,
    defaultAction,
    defaultBranch,
    scheme,
    platform,
    language,
    cachedCname,
    publish,
    createdByPlasmic,
  } = uncheckedCast<ApiProjectRepository>(req.body);

  const maybeToken = req.body.token as string | undefined;
  const token = ensureString(maybeToken ?? tryGetGithubTokenHeader(req));

  const [repoOwner, repoName] = repository.split("/");
  await assertCanUseGithubRepository(token, repoOwner, repoName);

  const mgr = userDbMgr(req);
  const repo = await mgr.createProjectRepository({
    projectId,
    installationId,
    repository,
    directory,
    defaultAction,
    defaultBranch,
    scheme,
    platform,
    language,
    cachedCname,
    publish,
    createdByPlasmic,
  });

  res.json({ repo });
}

export async function deleteProjectRepository(req: Request, res: Response) {
  const { projectRepositoryId } = req.params;
  const { projectId } = req.body;
  const mgr = userDbMgr(req);
  const repository = await mgr.getProjectRepositoryById(projectRepositoryId);
  assert(projectId === repository.projectId, "Unexpected projectId");
  await mgr.permanentlyDeleteProjectRepository(repository);
  res.json({});
}

export async function getProjectRepositories(req: Request, res: Response) {
  const { projectId } = req.params;
  const mgr = userDbMgr(req);
  const items = await mgr.listProjectRepositories(projectId);

  const projectRepositories: Array<ApiProjectRepository> = [];
  for (const item of items) {
    try {
      const branches = await fetchGithubBranches(
        item.installationId,
        item.repository
      );

      projectRepositories.push({
        id: item.id,
        projectId,
        installationId: item.installationId,
        repository: item.repository,
        directory: item.directory,
        defaultAction: item.defaultAction as GitSyncAction,
        defaultBranch: item.defaultBranch,
        branches,
        platform: item.platform,
        scheme: item.scheme,
        language: item.language,
        publish: item.publish,
        createdByPlasmic: item.createdByPlasmic,
        cachedCname: item.cachedCname ?? undefined,
      });
    } catch (err) {
      if (err?.status === 401 || err?.status === 404) {
        // Repository is not accessible anymore (unauthorized or not found).
        await mgr.deleteProjectRepository(item.id);
        continue;
      }
      throw err;
    }
  }

  res.json({ projectRepositories });
}

export async function githubBranches(req: Request, res: Response) {
  const { token: maybeToken, installationId, name } = parseQueryParams(req);
  const token = ensureString(maybeToken ?? tryGetGithubTokenHeader(req));

  const [owner, repo] = name.split("/");
  await assertCanUseGithubRepository(token, owner, repo);
  const branches = await fetchGithubBranches(installationId, name);
  res.json(ensureType<GitBranchesResponse>({ branches }));
}

export async function fireGitAction(req: Request, res: Response) {
  const { projectRepositoryId } = req.params;

  const projectId = req.body.projectId as string;
  const action = (req.body.action as string) || undefined;
  if (action && !["commit", "pr", "build"].includes(action)) {
    throw new NotFoundError("Unknown action");
  }
  const branch = (req.body.branch as string) || undefined;
  const title = (req.body.title as string) || undefined;
  const description = (req.body.description as string) || undefined;

  const config = req.config;
  const user = getUser(req);

  const mgr = userDbMgr(req);
  const projectRepository = await mgr.getProjectRepositoryById(
    projectRepositoryId
  );
  assert(projectId === projectRepository.projectId, "Unexpected projectId");

  const run = await runGitJob({
    config,
    mgr,
    user,
    projectRepository,
    action,
    branch,
    title,
    description,
  });

  res.json(run);
}

export async function getLatestWorkflowRun(req: Request, res: Response) {
  const { projectRepositoryId } = req.params;
  const { projectId } = parseQueryParams(req);

  const mgr = userDbMgr(req);
  const projectRepository = await mgr.getProjectRepositoryById(
    projectRepositoryId
  );
  assert(projectId === projectRepository.projectId, "Unexpected projectId");

  const [owner, repo] = projectRepository.repository.split("/");
  const ref = {
    installationId: projectRepository.installationId,
    owner,
    repo,
  };

  const run = await tryGetLastUnfinishedWorkflowRun(ref);
  res.json(run);
}

export async function getGitWorkflowJob(req: Request, res: Response) {
  const { projectRepositoryId, workflowRunId: workflowRunIdStr } = req.params;
  const workflowRunId = Number(workflowRunIdStr);
  const { projectId } = parseQueryParams(req);

  const mgr = userDbMgr(req);
  const projectRepository = await mgr.getProjectRepositoryById(
    projectRepositoryId
  );
  assert(projectId === projectRepository.projectId, "Unexpected projectId");
  const { installationId, repository } = projectRepository;
  const [owner, repo] = repository.split("/");

  const job = await getGitJob({ installationId, owner, repo }, workflowRunId);
  res.json({ job });
}

export async function detectOptionsFromDirectory(req: Request, res: Response) {
  const { owner, repo } = req.params;
  const {
    branch,
    token: maybeToken,
    installationId,
    dir,
  } = parseQueryParams(req);
  const token = ensureString(maybeToken ?? tryGetGithubTokenHeader(req));

  await assertCanUseGithubRepository(token, owner, repo);

  try {
    const syncOptions = await detectSyncOptions(
      installationId,
      owner,
      repo,
      branch,
      dir
    );

    res.json({ syncOptions });
  } catch (e) {
    // We expect detectSyncOptions() to throw 404 errors if it can't find
    // package.json. That shouldn't be thrown to Sentry.
    if (e.status === 404) {
      res.sendStatus(404);
    } else {
      throw e;
    }
  }
}
