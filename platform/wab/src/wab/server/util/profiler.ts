export async function maybeStartGoogleCloudProfiler(
  logContext?: string
): Promise<void> {
  const service = process.env.GCLOUD_PROFILER_SERVICE;
  if (!service) {
    return;
  }
  try {
    // Required lazily because `@google-cloud/profiler` eagerly loads the
    // native pprof addon at import time.
    const {
      start: startGoogleCloudProfiler,
      // eslint-disable-next-line @typescript-eslint/no-var-requires
    } =
      require("@google-cloud/profiler") as typeof import("@google-cloud/profiler");
    await startGoogleCloudProfiler({ serviceContext: { service } });
  } catch (error) {
    process.stderr.write(
      `Failed to start Google Cloud Profiler${
        logContext ? ` in ${logContext}` : ""
      }: ${error?.stack ?? error}\n`
    );
  }
}
