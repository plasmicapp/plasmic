/** @vitest-environment node */
import { logger } from "@/wab/server/observability";
import { genLoaderHtmlBundleSandboxed } from "@/wab/server/routes/loader";
import { setSentryErrorContext } from "@/wab/server/sentry";
import { NotFoundError } from "@/wab/shared/ApiErrors/errors";

const { runSubprocess } = vi.hoisted(() => ({ runSubprocess: vi.fn() }));
vi.mock("execa", () => ({ default: runSubprocess }));
vi.mock("@/wab/server/sentry", () => ({ setSentryErrorContext: vi.fn() }));
vi.mock("@/wab/server/observability", () => {
  const log = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return { logger: () => log };
});

const args = {
  projectId: "project",
  component: "component",
  projectToken: "secret-token",
};
const success = {
  stdout: "<div>HTML</div>",
  stderr: "",
  exitCode: 0,
  failed: false,
  timedOut: false,
  signal: undefined,
};

beforeEach(() => vi.clearAllMocks());

it("returns successful HTML", async () => {
  runSubprocess.mockResolvedValueOnce(success);
  await expect(genLoaderHtmlBundleSandboxed(args)).resolves.toEqual({
    html: success.stdout,
  });
  expect(logger().error).not.toHaveBeenCalled();
  expect(setSentryErrorContext).not.toHaveBeenCalled();
});

it.each([
  {
    ...success,
    stdout: "partial HTML",
    stderr: "render failed",
    failed: true,
    exitCode: 1,
  },
  { ...success, stdout: "" },
  {
    ...success,
    stdout: "",
    failed: true,
    exitCode: undefined,
    signal: "SIGKILL",
    timedOut: false,
  },
])(
  "rejects failed or empty output and records process metadata",
  async (result) => {
    runSubprocess.mockResolvedValueOnce(result);
    let thrown: unknown;
    try {
      await genLoaderHtmlBundleSandboxed(args);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect(logger().error).toHaveBeenCalledWith(
      "Sandboxed loader subprocess failed",
      expect.objectContaining({
        projectId: args.projectId,
        component: args.component,
        exitCode: result.exitCode,
        failed: result.failed,
        timedOut: result.timedOut,
        signal: result.signal,
        stdoutLength: result.stdout.length,
      }),
    );
    expect(setSentryErrorContext).toHaveBeenCalledWith(
      thrown,
      "htmlBuild",
      expect.objectContaining({
        exitCode: result.exitCode,
        signal: result.signal,
      }),
    );
  },
);

it("caps the diagnostic after redacting the project token", async () => {
  const stderr = args.projectToken + "x".repeat(20000);
  runSubprocess.mockResolvedValueOnce({
    ...success,
    failed: true,
    exitCode: 1,
    stderr,
  });
  await expect(genLoaderHtmlBundleSandboxed(args)).rejects.toThrow(
    "Sandboxed loader subprocess failed",
  );
  expect(logger().error).toHaveBeenCalledWith(
    "Sandboxed loader subprocess failed",
    expect.objectContaining({
      stderr: ("[redacted]" + "x".repeat(20000)).slice(0, 8192),
    }),
  );
  expect(setSentryErrorContext).toHaveBeenCalledWith(
    expect.any(Error),
    "htmlBuild",
    expect.objectContaining({
      stderr: ("[redacted]" + "x".repeat(20000)).slice(0, 8192),
    }),
  );
});

it("preserves missing-component handling without returning the stack", async () => {
  runSubprocess.mockResolvedValueOnce({
    ...success,
    exitCode: 1,
    failed: true,
    stderr: "Error: Unable to find components Missing\nstack trace",
  });
  await expect(genLoaderHtmlBundleSandboxed(args)).rejects.toEqual(
    new NotFoundError("Error: Unable to find components Missing"),
  );
  expect(setSentryErrorContext).not.toHaveBeenCalled();
});

it("logs spawn failures without the credential-bearing command", async () => {
  const result = Object.assign(new Error("command secret-token"), success, {
    stdout: "",
    exitCode: undefined,
    failed: true,
    originalMessage: "spawn bwrap ENOENT",
  });
  runSubprocess.mockResolvedValueOnce(result);
  await expect(genLoaderHtmlBundleSandboxed(args)).rejects.toBeInstanceOf(
    Error,
  );
  expect(logger().error).toHaveBeenCalledWith(
    "Sandboxed loader subprocess failed",
    expect.objectContaining({ spawnError: "spawn bwrap ENOENT" }),
  );
  expect(setSentryErrorContext).toHaveBeenCalledWith(
    expect.any(Error),
    "htmlBuild",
    expect.objectContaining({
      spawnError: "spawn bwrap ENOENT",
    }),
  );
  expect(
    JSON.stringify(vi.mocked(setSentryErrorContext).mock.calls),
  ).not.toContain("secret-token");
  expect(JSON.stringify(vi.mocked(logger().error).mock.calls)).not.toContain(
    "secret-token",
  );
});
