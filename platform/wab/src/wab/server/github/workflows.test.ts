import { getDefaultBranch } from "@/wab/server/github/branches";
import {
  createOrUpdatePushWorkflow,
  getGitJob,
  triggerWorkflow,
  tryGetLastUnfinishedWorkflowRun,
  WorkflowData,
} from "@/wab/server/github/workflows";
import { RateLimitedExceeded } from "@/wab/shared/ApiErrors/errors";

const { request, getInstallationOctokit } = vi.hoisted(() => ({
  request: vi.fn(),
  getInstallationOctokit: vi.fn(),
}));
vi.mock("@/wab/server/github/app", () => ({
  getGithubApp: () => ({ getInstallationOctokit }),
}));

const ref = {
  installationId: 123,
  owner: "owner",
  repo: "repo",
  branch: "main",
};
const workflow: WorkflowData = {
  branch: "main",
  directory: "",
  projectId: "project",
  projectApiToken: "token",
  platform: "react",
  language: "ts",
  scheme: "codegen",
  syncAction: "pr",
  title: "Sync",
  description: "",
  publish: false,
};
const operations = [
  ["workflow status", () => tryGetLastUnfinishedWorkflowRun(ref)],
  ["job status", () => getGitJob(ref, 456)],
  ["workflow dispatch", () => triggerWorkflow(ref, workflow)],
  ["workflow file", () => createOrUpdatePushWorkflow(ref)],
  [
    "default branch",
    () => getDefaultBranch(ref.installationId, ref.owner, ref.repo),
  ],
] as const;

beforeEach(() => {
  request.mockReset();
  getInstallationOctokit.mockReset().mockResolvedValue({ request });
});

it.each(operations)("translates rate limits during %s", async (_, run) => {
  request.mockRejectedValue(
    Object.assign(new Error("API rate limit exceeded"), { status: 403 }),
  );
  await expect(run()).rejects.toThrow(RateLimitedExceeded);
  expect(request).toHaveBeenCalledTimes(1);
});

// The workflow file operation swallows unrelated read errors, so it's tested
// separately below.
it.each(operations.filter(([name]) => name !== "workflow file"))(
  "preserves unrelated errors during %s",
  async (_, run) => {
    const error = Object.assign(new Error("Server error"), { status: 500 });
    request.mockRejectedValue(error);
    await expect(run()).rejects.toBe(error);
  },
);

it("preserves unrelated write errors after a successful workflow file read", async () => {
  const error = Object.assign(new Error("Server error"), { status: 500 });
  request
    .mockResolvedValueOnce({
      data: {
        sha: "abc",
        content: Buffer.from("old content").toString("base64"),
      },
    })
    .mockRejectedValueOnce(error);
  await expect(createOrUpdatePushWorkflow(ref)).rejects.toBe(error);
  expect(request.mock.calls.map(([route]) => route)).toEqual([
    "GET /repos/{owner}/{repo}/contents/{path}",
    "PUT /repos/{owner}/{repo}/contents/{path}",
  ]);
});

it.each(operations)(
  "translates installation auth rate limits during %s",
  async (_, run) => {
    getInstallationOctokit.mockRejectedValue(
      Object.assign(new Error("Too many requests"), { status: 429 }),
    );
    await expect(run()).rejects.toThrow(RateLimitedExceeded);
    expect(request).not.toHaveBeenCalled();
  },
);

it("preserves missing workflow jobs", async () => {
  request.mockRejectedValue(
    Object.assign(new Error("Not Found"), { status: 404 }),
  );
  await expect(getGitJob(ref, 456)).resolves.toBeUndefined();
});

it("translates a rate limited write after a missing-file read", async () => {
  request
    .mockRejectedValueOnce(
      Object.assign(new Error("Not Found"), { status: 404 }),
    )
    .mockRejectedValueOnce(
      Object.assign(new Error("API rate limit exceeded"), { status: 403 }),
    );
  await expect(createOrUpdatePushWorkflow(ref)).rejects.toThrow(
    RateLimitedExceeded,
  );
  expect(request.mock.calls.map(([route]) => route)).toEqual([
    "GET /repos/{owner}/{repo}/contents/{path}",
    "PUT /repos/{owner}/{repo}/contents/{path}",
  ]);
});

it("returns unknown when there is no unfinished workflow", async () => {
  request.mockResolvedValue({ data: { workflow_runs: [] } });
  await expect(tryGetLastUnfinishedWorkflowRun(ref)).resolves.toEqual({
    state: "unknown",
  });
});

it("returns the unfinished workflow and its job URL", async () => {
  request
    .mockResolvedValueOnce({
      data: { workflow_runs: [{ id: 456, status: "in_progress" }] },
    })
    .mockResolvedValueOnce({
      data: {
        jobs: [{ html_url: "https://github.com/owner/repo/actions/runs/456" }],
      },
    });
  await expect(tryGetLastUnfinishedWorkflowRun(ref)).resolves.toEqual({
    state: "running",
    workflowRunId: 456,
    workflowJobUrl: "https://github.com/owner/repo/actions/runs/456",
  });
});
