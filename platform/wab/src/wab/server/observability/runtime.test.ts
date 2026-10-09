import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

it("runs spans through the backend script loader without initializing Sentry", async () => {
  // Vitest resolves dynamic aliases that the backend's require hook cannot.
  const script = `
    const assert = require("node:assert/strict");
    const Sentry = require("@sentry/node");
    const { trace } = require("@opentelemetry/api");
    const { register } = require("prom-client");
    const provider = trace.getTracerProvider();
    const { withSpan } = require("./src/wab/server/observability");

    async function main() {
      assert.equal(Sentry.getClient(), undefined);
      assert.equal(await withSpan("runtime-success", async () => 42), 42);
      const failure = new Error("runtime failure");
      await assert.rejects(
        withSpan("runtime-failure", async () => { throw failure; }),
        (error) => error === failure,
      );
      const metric = await register.getSingleMetric("task_duration").get();
      for (const task of ["runtime-success", "runtime-failure"]) {
        const count = metric.values.find(
          (value) => value.metricName === "task_duration_count" && value.labels.task === task,
        );
        assert.equal(count.value, 1);
      }
      assert.equal(Sentry.getClient(), undefined);
      assert.equal(trace.getTracerProvider(), provider);
      console.log("Backend span lifecycle passed");
    }
    main().catch((error) => { console.error(error); process.exitCode = 1; });
  `;
  const { stdout } = await promisify(execFile)(
    "bash",
    ["tools/run.bash", "-e", script],
    {
      cwd: path.resolve(__dirname, "../../../.."),
      env: {
        ...process.env,
        NODE_ENV: "test",
        NODE_OPTIONS: "",
        DOTENV_CONFIG_PATH: "/dev/null",
        SENTRY_DSN: "http://public@127.0.0.1/1",
        MAX_HEAP_SIZE: "2048",
      },
      timeout: 30_000,
    },
  );
  expect(stdout).toContain("Backend span lifecycle passed");
});
