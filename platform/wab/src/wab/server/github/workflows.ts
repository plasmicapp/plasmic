import { getStatusCodeFromResponse } from "@/wab/server/AppServer";
import { getGithubApp } from "@/wab/server/github/app";
import { getDefaultBranch } from "@/wab/server/github/branches";
import { GithubRef } from "@/wab/server/github/types";
import {
  GitSyncAction,
  GitSyncLanguage,
  GitSyncPlatform,
  GitSyncScheme,
  GitWorkflowJob,
  GitWorkflowJobStatus,
} from "@/wab/shared/ApiSchema";
import { readFileSync } from "fs";

const gitUserName = "Plasmic Bot";
const gitUserEmail = "ops+git@plasmic.app";
export interface WorkflowData {
  branch: string;
  directory: string;
  projectId: string;
  projectApiToken: string;
  platform: GitSyncPlatform;
  language: GitSyncLanguage;
  scheme: GitSyncScheme;
  syncAction: GitSyncAction;
  title: string;
  description: string;
  publish: boolean;
}

interface FileArgs extends GithubRef {
  path: string;
  content: string;
  message: string;
}

async function createOrUpdateFile(args: FileArgs) {
  const { installationId, owner, repo, branch, path, content, message } = args;

  const app = getGithubApp();
  const octokit = await app.getInstallationOctokit(installationId);

  let sha: string | undefined = undefined;
  try {
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      {
        owner,
        repo,
        path,
      }
    );
    if ("sha" in data) {
      sha = data.sha;
    }
    if ("content" in data) {
      const existing = Buffer.from(data.content, "base64").toString("ascii");
      if (content === existing) {
        // Nothing to update.
        return;
      }
    }
  } catch (_) {}

  await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
    owner,
    repo,
    branch,
    path,
    message,
    sha,
    content: Buffer.from(content).toString("base64"),
    committer: {
      name: gitUserName,
      email: gitUserEmail,
    },
  });
}

const dispatchWorkflow = readFileSync(`${__dirname}/plasmic.yml`).toString();
export async function createOrUpdateWorkflow(args: Omit<GithubRef, "branch">) {
  const message = "Add/update Plasmic workflow";
  const path = ".github/workflows/plasmic.yml";
  const content = dispatchWorkflow;

  // Workflow must be created on default branch (usually master/main) to
  // receive repository_dispatch events.
  const branch = await getDefaultBranch(
    args.installationId,
    args.owner,
    args.repo
  );

  await createOrUpdateFile({
    ...args,
    branch,
    message,
    path,
    content,
  });
}

const pushWorkflow = readFileSync(`${__dirname}/plasmic-push.yml`).toString();
export async function createOrUpdatePushWorkflow(args: GithubRef) {
  const message = "Add/update Plasmic push workflow";
  const path = ".github/workflows/plasmic-push.yml";
  const content = pushWorkflow;

  await createOrUpdateFile({
    ...args,
    message,
    path,
    content,
  });
}

export async function triggerWorkflow(ref: GithubRef, data: WorkflowData) {
  const { installationId, owner, repo } = ref;

  const app = getGithubApp();
  const octokit = await app.getInstallationOctokit(installationId);
  await octokit.request("POST /repos/{owner}/{repo}/dispatches", {
    owner,
    repo,
    event_type: "plasmic",
    client_payload: {
      data,
    },
  });
}

export async function tryGetLastUnfinishedWorkflowRun(
  ref: Omit<GithubRef, "branch">
): Promise<GitWorkflowJobStatus> {
  const { installationId, owner, repo } = ref;

  const app = getGithubApp();
  const octokit = await app.getInstallationOctokit(installationId);
  const {
    data: { workflow_runs: allRuns },
  } = await octokit.request(
    "GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs",
    {
      owner,
      repo,
      workflow_id: "plasmic.yml",
    }
  );
  const unfinishedRuns = allRuns.filter((run) =>
    ["requested", "waiting", "queued", "in_progress"].includes(
      run.status as string
    )
  );
  const run = unfinishedRuns[0];
  if (!run) {
    return { state: "unknown" };
  }
  const job = await getGitJob(ref, run.id);
  return {
    state: "running",
    workflowRunId: run.id,
    workflowJobUrl: job?.html_url,
  };
}

export async function getGitJob(
  ref: Omit<GithubRef, "branch">,
  run_id: number
): Promise<GitWorkflowJob | undefined> {
  const { installationId, owner, repo } = ref;

  const app = getGithubApp();
  const octokit = await app.getInstallationOctokit(installationId);
  try {
    const {
      data: { jobs },
    } = await octokit.request(
      "GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs",
      { owner, repo, run_id }
    );
    return jobs[0];
  } catch (err) {
    if (getStatusCodeFromResponse(err) === 404) {
      // Sometimes GitHub returns 404 if it has just created the workflow run.
      // In that case, it's safe to just return undefined.
      return undefined;
    }

    throw err;
  }
}
